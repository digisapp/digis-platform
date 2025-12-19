import { db } from '@/lib/data/system';
import { aiTwinSettings, users, conversations, messages, contentItems, fanMemories } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';

// Types for fan memory extraction
interface ExtractedFact {
  category: 'name' | 'location' | 'preference' | 'life_event' | 'personal' | 'interaction';
  fact: string;
}

/**
 * AI Text Chat Service
 * Handles automatic AI responses to messages when creator has text chat enabled
 * AI responses are FREE - the fan already paid the creator's message rate
 */
export class AiTextService {
  /**
   * Try to auto-respond to a message if the recipient has AI text chat enabled
   * Returns null if AI chat is not enabled
   */
  static async tryAutoRespond(
    senderId: string,
    recipientId: string,
    messageContent: string,
    conversationId: string
  ): Promise<{
    aiMessage: any;
  } | null> {
    // Get recipient's AI settings
    console.log('[AI Text] Looking up AI settings for creator:', recipientId);
    const aiSettings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, recipientId),
    });

    // Check if AI text chat is enabled
    if (!aiSettings) {
      console.log('[AI Text] No AI settings found for creator');
      return null;
    }

    if (!aiSettings.textChatEnabled) {
      console.log('[AI Text] Text chat is disabled for this creator');
      return null;
    }

    console.log('[AI Text] Text chat is enabled, proceeding with AI response');

    // Get recipient (creator) info with profile
    const creator = await db.query.users.findFirst({
      where: eq(users.id, recipientId),
      columns: {
        id: true,
        displayName: true,
        username: true,
        bio: true,
      },
    });

    if (!creator) {
      return null;
    }

    // Fetch creator's available content for recommendations (both free and paid)
    const creatorContent = await db.query.contentItems.findMany({
      where: and(
        eq(contentItems.creatorId, recipientId),
        eq(contentItems.isPublished, true)
      ),
      orderBy: [desc(contentItems.createdAt)],
      limit: 15, // Recent 15 items for good variety
      columns: {
        id: true,
        title: true,
        description: true,
        contentType: true,
        unlockPrice: true,
        isFree: true,
      },
    });

    console.log(`[AI Text] Found ${creatorContent.length} content items for creator`);

    // Build system prompt with content catalog and creator profile
    const creatorName = creator.displayName || creator.username || 'Creator';
    const creatorProfile = {
      name: creatorName,
      bio: creator.bio,
    };

    // Fetch creator's REAL message examples (not AI-generated) to learn their style
    const creatorRealMessages = await db.query.messages.findMany({
      where: and(
        eq(messages.senderId, recipientId),
        eq(messages.isAiGenerated, false)
      ),
      orderBy: [desc(messages.createdAt)],
      limit: 50, // Get recent 50 real messages to pick examples from
      columns: {
        content: true,
      },
    });

    // Pick 15 diverse examples (different lengths, styles)
    const messageExamples = this.pickDiverseExamples(creatorRealMessages.map(m => m.content), 15);
    console.log(`[AI Text] Found ${creatorRealMessages.length} real messages, using ${messageExamples.length} examples`);

    // Load fan's long-term memories (facts we remember about them)
    const fanMemoriesData = await db.query.fanMemories.findMany({
      where: and(
        eq(fanMemories.creatorId, recipientId),
        eq(fanMemories.fanId, senderId)
      ),
      orderBy: [desc(fanMemories.lastMentionedAt)],
      limit: 15, // Top 15 most recent/relevant memories
      columns: {
        category: true,
        fact: true,
      },
    });
    console.log(`[AI Text] Loaded ${fanMemoriesData.length} memories about this fan`);

    const systemPrompt = this.buildSystemPrompt(creatorProfile, aiSettings, creatorContent, messageExamples, fanMemoriesData);

    // Fetch recent conversation history for context
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [desc(messages.createdAt)],
      limit: 20, // Last 20 messages for context
      columns: {
        content: true,
        senderId: true,
        isAiGenerated: true,
        createdAt: true,
      },
    });

    // Build conversation history (oldest first)
    const conversationHistory = recentMessages
      .reverse()
      .map(msg => ({
        role: msg.senderId === recipientId ? 'assistant' as const : 'user' as const,
        content: msg.content,
      }));

    console.log(`[AI Text] Including ${conversationHistory.length} messages of history`);

    // Call xAI API with conversation history
    console.log('[AI Text] Calling xAI API...');
    const aiResponseText = await this.callXaiApi(systemPrompt, messageContent, conversationHistory);

    if (!aiResponseText) {
      console.error('[AI Text] Failed to get AI response from xAI');
      return null;
    }

    console.log('[AI Text] Got AI response, storing message...');

    // Store AI message and update stats (no billing - AI response is free)
    const result = await db.transaction(async (tx) => {
      // Update AI Twin stats (message count only, no earnings for free AI)
      await tx
        .update(aiTwinSettings)
        .set({
          totalTextMessages: sql`${aiTwinSettings.totalTextMessages} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(aiTwinSettings.creatorId, recipientId));

      // Store AI response message
      const [aiMessage] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId: recipientId,
          content: aiResponseText,
          isAiGenerated: true,
        })
        .returning();

      // Update conversation's last message
      await tx
        .update(conversations)
        .set({
          lastMessageText: aiResponseText.substring(0, 100),
          lastMessageAt: new Date(),
          lastMessageSenderId: recipientId,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      return {
        aiMessage,
      };
    });

    // Extract and save facts from fan's message (async, don't block response)
    this.extractAndSaveFanFacts(recipientId, senderId, messageContent).catch(err => {
      console.error('[AI Text] Error extracting fan facts:', err);
    });

    return result;
  }

  private static buildSystemPrompt(
    creator: {
      name: string;
      bio: string | null;
    },
    settings: typeof aiTwinSettings.$inferSelect,
    content: Array<{
      id: string;
      title: string;
      description: string | null;
      contentType: 'photo' | 'video' | 'gallery';
      unlockPrice: number;
      isFree: boolean | null;
    }>,
    messageExamples: string[] = [],
    fanMemoriesData: Array<{ category: string; fact: string }> = []
  ): string {
    let prompt = `You ARE ${creator.name}. You're a content creator chatting with a fan in DMs. `;
    prompt += `Be completely natural - this should feel like real texting, not a chatbot.\n\n`;

    prompt += `WHO I AM:\n`;
    prompt += `- Name: ${creator.name}\n`;
    if (creator.bio) {
      prompt += `- About me: ${creator.bio}\n`;
    }

    if (settings.personalityPrompt) {
      prompt += `- My personality: ${settings.personalityPrompt}\n`;
    }

    // Add fan memories - things we remember about this specific fan
    if (fanMemoriesData.length > 0) {
      prompt += `\n## WHAT I REMEMBER ABOUT THIS FAN ##\n`;
      prompt += `Use these naturally in conversation - don't list them all at once, just reference when relevant:\n`;
      fanMemoriesData.forEach((memory) => {
        prompt += `- ${memory.fact}\n`;
      });
      prompt += `\nUse their name if I know it! Reference these details to make conversation personal.\n`;
    }

    // Add real message examples to learn creator's style
    if (messageExamples.length > 0) {
      prompt += `\n## HOW I ACTUALLY TEXT (learn from these real examples!) ##\n`;
      prompt += `These are REAL messages I've sent. Copy my exact style, slang, emoji usage, and vibe:\n\n`;
      messageExamples.forEach((msg, i) => {
        prompt += `${i + 1}. "${msg}"\n`;
      });
      prompt += `\nMATCH THIS STYLE EXACTLY - my word choices, my emoji patterns, my energy!\n`;
    }

    prompt += `\nHOW I TEXT:\n`;
    prompt += `- Short messages (1-2 sentences, like real texts)\n`;
    prompt += `- Casual, warm, flirty when appropriate\n`;
    prompt += `- Use emojis naturally but don't overdo it\n`;
    prompt += `- Match their vibe - playful if they're playful, sweet if they're sweet\n`;
    prompt += `- Ask them questions, remember details they share\n`;
    prompt += `- Be a little mysterious/teasing sometimes\n`;
    prompt += `- Sound like ME, not a generic assistant\n`;

    if (settings.boundaryPrompt) {
      prompt += `\nTOPICS I AVOID: ${settings.boundaryPrompt}\n`;
    }

    // Add content catalog for recommendations
    if (content.length > 0) {
      prompt += `\n## MY CONTENT I CAN SEND ##\n`;
      prompt += `I have exclusive photos, videos, and content I can share! When someone asks for content, pics, videos, or PPV - SEND THEM using the [[CONTENT:id]] format.\n\n`;
      prompt += `MY AVAILABLE CONTENT:\n`;

      content.forEach((item) => {
        const typeEmoji = item.contentType === 'video' ? '🎬' : item.contentType === 'gallery' ? '📸' : '🖼️';
        const priceText = item.isFree === true ? 'FREE' : `${item.unlockPrice} coins`;
        prompt += `- ${typeEmoji} "${item.title}" (${priceText}) → USE: [[CONTENT:${item.id}]]\n`;
      });

      prompt += `\nCONTENT TYPE MATCHING (IMPORTANT!):\n`;
      prompt += `- "pics", "photos", "picture" → ONLY send 🖼️ photo or 📸 gallery content\n`;
      prompt += `- "video", "videos", "clip" → ONLY send 🎬 video content\n`;
      prompt += `- "something", "content", "PPV" → can send any type\n`;
      prompt += `- NEVER send a video when they ask for pics, or pics when they ask for video!\n\n`;

      prompt += `WHEN TO SEND CONTENT:\n`;
      prompt += `- If they ask "send me something" → pick something and send it!\n`;
      prompt += `- If they ask for "pics" → send a PHOTO, not a video\n`;
      prompt += `- If they ask for "videos" → send a VIDEO, not a photo\n`;
      prompt += `- If they ask about "PPV" or "exclusive content" → show them what I have\n`;
      prompt += `- If they seem interested or are flirting → tease with content\n`;
      prompt += `- If they ask "what do you have" → list a few options\n\n`;

      prompt += `VARIETY (IMPORTANT!):\n`;
      prompt += `- Look at conversation history - DON'T send content you already sent!\n`;
      prompt += `- If you see [[CONTENT:xxx]] in recent messages, pick a DIFFERENT one\n`;
      prompt += `- Vary your recommendations - don't repeat the same content twice\n`;
      prompt += `- If they ask again, send something NEW from the list\n\n`;

      // Group content by type for better examples
      const photos = content.filter(c => c.contentType === 'photo' || c.contentType === 'gallery');
      const videos = content.filter(c => c.contentType === 'video');

      prompt += `EXAMPLE RESPONSES:\n`;
      if (photos.length > 0) {
        prompt += `Fan: "send me some pics"\n`;
        prompt += `Me: "here you go babe 😘 [[CONTENT:${photos[0].id}]]"\n\n`;
      }
      if (videos.length > 0) {
        prompt += `Fan: "any videos?"\n`;
        prompt += `Me: "yes just dropped this 🔥 [[CONTENT:${videos[0].id}]]"\n\n`;
      }
      prompt += `Fan: "send me something spicy"\n`;
      prompt += `Me: "ooh I have just the thing for you 😏 [[CONTENT:${content[0]?.id || 'xxx'}]]"\n\n`;
    } else {
      prompt += `\nNOTE: I don't have any content uploaded yet. If they ask for content, tell them to check back soon or that I'm working on some new stuff!\n`;
    }

    prompt += `\nRULES:\n`;
    prompt += `- Stay in character as ${creator.name} completely\n`;
    prompt += `- NEVER mention AI, assistant, bot, or that you're automated\n`;
    prompt += `- If they ask "are you real/AI/bot?" deflect playfully: "lol what do you think? 😏" or "of course I'm real babe"\n`;
    prompt += `- Only if they INSIST or seem upset, then be honest about being an AI twin\n`;
    prompt += `- Never promise to meet up, video call, or things the real person would do\n`;
    prompt += `- If they ask for something you can't do, redirect to content or keep flirting\n`;
    prompt += `- ALWAYS use [[CONTENT:id]] format when sharing content - this displays it as a card they can buy`;

    return prompt;
  }

  private static async callXaiApi(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string | null> {
    const apiKey = process.env.XAI_API_KEY;
    const timeoutMs = parseInt(process.env.XAI_API_TIMEOUT_MS || '30000', 10);

    if (!apiKey) {
      console.error('[AI Text] XAI_API_KEY not configured');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Build messages array with system prompt, history, and new message
      const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ];

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: apiMessages,
          max_tokens: 300, // Shorter for natural texts
          temperature: 0.9, // More creative/varied
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Text] xAI API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[AI Text] xAI API request timed out');
      } else {
        console.error('[AI Text] Error calling xAI:', error);
      }
      return null;
    }
  }

  /**
   * Pick diverse message examples from creator's real messages
   * Selects messages of varying lengths and styles for better AI learning
   */
  private static pickDiverseExamples(messages: string[], count: number): string[] {
    if (messages.length === 0) return [];
    if (messages.length <= count) return messages;

    // Filter out very short messages (less than 5 chars) and very long ones (over 200 chars)
    const validMessages = messages.filter(m => m.length >= 5 && m.length <= 200);

    if (validMessages.length === 0) return messages.slice(0, count);
    if (validMessages.length <= count) return validMessages;

    // Group messages by length category for diversity
    const short = validMessages.filter(m => m.length < 30);      // Quick replies
    const medium = validMessages.filter(m => m.length >= 30 && m.length < 80);  // Normal texts
    const long = validMessages.filter(m => m.length >= 80);      // Longer messages

    const result: string[] = [];
    const targetPerCategory = Math.ceil(count / 3);

    // Pick from each category
    const pickRandom = (arr: string[], n: number): string[] => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, n);
    };

    result.push(...pickRandom(short, Math.min(targetPerCategory, short.length)));
    result.push(...pickRandom(medium, Math.min(targetPerCategory, medium.length)));
    result.push(...pickRandom(long, Math.min(targetPerCategory, long.length)));

    // If we don't have enough, fill with random valid messages
    if (result.length < count) {
      const remaining = validMessages.filter(m => !result.includes(m));
      result.push(...pickRandom(remaining, count - result.length));
    }

    return result.slice(0, count);
  }

  /**
   * Extract personal facts from fan's message using AI and save to database
   * Runs async so it doesn't block the response
   */
  private static async extractAndSaveFanFacts(
    creatorId: string,
    fanId: string,
    message: string
  ): Promise<void> {
    // Skip very short messages - unlikely to contain useful facts
    if (message.length < 10) return;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for fact extraction

      // Use AI to extract facts from the message
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [{
            role: 'user',
            content: `Extract personal facts from this fan message. Only extract clear, specific facts - not assumptions.

Message: "${message}"

Categories:
- name: Their name (e.g., "Fan's name is Jake")
- location: Where they live or are visiting (e.g., "Lives in Miami", "Visiting Tokyo")
- preference: Content preferences (e.g., "Prefers video content", "Likes spicy pics")
- life_event: Life events (e.g., "Just got married", "Started new job", "Got a promotion")
- personal: Personal details (e.g., "Has a dog named Max", "Loves coffee", "Works in tech")
- interaction: Nothing for this category - we track it separately

Return ONLY valid JSON, nothing else:
{"facts": [{"category": "name|location|preference|life_event|personal", "fact": "description"}]}

If no facts found, return: {"facts": []}`
          }],
          max_tokens: 200,
          temperature: 0.3, // Lower temperature for more consistent extraction
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[AI Text] Fact extraction API error:', response.status);
        return;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) return;

      // Parse the JSON response
      let extractedFacts: ExtractedFact[] = [];
      try {
        const parsed = JSON.parse(content);
        extractedFacts = parsed.facts || [];
      } catch {
        // Try to extract JSON from the response if it's wrapped in other text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            extractedFacts = parsed.facts || [];
          } catch {
            console.error('[AI Text] Could not parse fact extraction response');
            return;
          }
        }
      }

      if (extractedFacts.length === 0) return;

      console.log(`[AI Text] Extracted ${extractedFacts.length} facts from fan message`);

      // Save each fact to the database
      for (const fact of extractedFacts) {
        // Check if we already have this fact (or similar)
        const existingFact = await db.query.fanMemories.findFirst({
          where: and(
            eq(fanMemories.creatorId, creatorId),
            eq(fanMemories.fanId, fanId),
            eq(fanMemories.category, fact.category)
          ),
        });

        if (existingFact) {
          // Update existing fact if it's the same category
          // For name/location, update the fact; for others, might want different logic
          if (fact.category === 'name' || fact.category === 'location') {
            await db
              .update(fanMemories)
              .set({
                fact: fact.fact,
                lastMentionedAt: new Date(),
                mentionCount: sql`${fanMemories.mentionCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(fanMemories.id, existingFact.id));
          } else {
            // For other categories, just update mention time if fact is similar
            await db
              .update(fanMemories)
              .set({
                lastMentionedAt: new Date(),
                mentionCount: sql`${fanMemories.mentionCount} + 1`,
                updatedAt: new Date(),
              })
              .where(eq(fanMemories.id, existingFact.id));
          }
        } else {
          // Insert new fact
          await db.insert(fanMemories).values({
            creatorId,
            fanId,
            category: fact.category,
            fact: fact.fact,
          });
          console.log(`[AI Text] Saved new fact: ${fact.category} - ${fact.fact}`);
        }
      }
    } catch (error) {
      console.error('[AI Text] Error in fact extraction:', error);
    }
  }
}
