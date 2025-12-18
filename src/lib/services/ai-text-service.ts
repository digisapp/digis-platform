import { db } from '@/lib/data/system';
import { aiTwinSettings, users, conversations, messages, contentItems } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';

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

    // Fetch creator's available content for recommendations
    const creatorContent = await db.query.contentItems.findMany({
      where: and(
        eq(contentItems.creatorId, recipientId),
        eq(contentItems.isPublished, true),
        eq(contentItems.isFree, false) // Only paid content for recommendations
      ),
      orderBy: [desc(contentItems.createdAt)],
      limit: 10, // Limit to recent 10 items to keep prompt size manageable
      columns: {
        id: true,
        title: true,
        description: true,
        contentType: true,
        unlockPrice: true,
      },
    });

    // Build system prompt with content catalog and creator profile
    const creatorName = creator.displayName || creator.username || 'Creator';
    const creatorProfile = {
      name: creatorName,
      bio: creator.bio,
    };
    const systemPrompt = this.buildSystemPrompt(creatorProfile, aiSettings, creatorContent);

    // Call xAI API
    console.log('[AI Text] Calling xAI API...');
    const aiResponseText = await this.callXaiApi(systemPrompt, messageContent);

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
    }>
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
      prompt += `\nMY EXCLUSIVE CONTENT:\n`;
      prompt += `When they ask about content or seem interested, I can share these (use [[CONTENT:id]] format):\n`;

      content.forEach((item) => {
        const typeEmoji = item.contentType === 'video' ? '🎬' : item.contentType === 'gallery' ? '📸' : '🖼️';
        prompt += `- ${typeEmoji} "${item.title}" - ${item.unlockPrice} coins → [[CONTENT:${item.id}]]\n`;
      });
    }

    prompt += `\nRULES:\n`;
    prompt += `- Stay in character as ${creator.name} completely\n`;
    prompt += `- NEVER mention AI, assistant, bot, or that you're automated\n`;
    prompt += `- If they ask "are you real/AI/bot?" deflect playfully: "lol what do you think? 😏" or "of course I'm real babe"\n`;
    prompt += `- Only if they INSIST or seem upset, then be honest about being an AI twin\n`;
    prompt += `- Never promise to meet up, video call, or things the real person would do\n`;
    prompt += `- If they ask for something you can't do, redirect to content or keep flirting`;

    return prompt;
  }

  private static async callXaiApi(
    systemPrompt: string,
    userMessage: string
  ): Promise<string | null> {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      console.error('[AI Text] XAI_API_KEY not configured');
      return null;
    }

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: 500,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Text] xAI API error:', response.status, errorText);
        return null;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error('[AI Text] Error calling xAI:', error);
      return null;
    }
  }
}
