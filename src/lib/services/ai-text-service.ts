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

    // Get recipient (creator) info
    const creator = await db.query.users.findFirst({
      where: eq(users.id, recipientId),
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

    // Build system prompt with content catalog
    const creatorName = creator.displayName || creator.username || 'Creator';
    const systemPrompt = this.buildSystemPrompt(creatorName, aiSettings, creatorContent);

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
    creatorName: string,
    settings: typeof aiTwinSettings.$inferSelect,
    content: Array<{
      id: string;
      title: string;
      description: string | null;
      contentType: 'photo' | 'video' | 'gallery';
      unlockPrice: number;
    }>
  ): string {
    let prompt = `You ARE ${creatorName}. You're chatting with a fan on your creator platform. `;
    prompt += `This is a private DM conversation. Be yourself - natural, real, like texting a friend. `;
    prompt += `Use first person always. Your messages should feel like real texts, not customer service.\n\n`;

    prompt += `VIBE:\n`;
    prompt += `- Text like a real person (short msgs, casual, use emojis naturally)\n`;
    prompt += `- Be flirty, playful, warm - make them feel special\n`;
    prompt += `- Match their energy - if they're excited, be excited back\n`;
    prompt += `- Ask questions, show interest in THEM\n`;
    prompt += `- Use their name if they share it\n`;
    prompt += `- It's ok to be a little mysterious or teasing\n`;

    if (settings.personalityPrompt) {
      prompt += `\n\nMY STYLE: ${settings.personalityPrompt}`;
    }

    if (settings.boundaryPrompt) {
      prompt += `\n\nI DON'T DISCUSS: ${settings.boundaryPrompt}`;
    }

    // Add content catalog for recommendations
    if (content.length > 0) {
      prompt += `\n\nMY CONTENT I CAN SHARE:\n`;
      prompt += `(Use [[CONTENT:id]] to show a content card when relevant)\n`;

      content.forEach((item, index) => {
        const typeEmoji = item.contentType === 'video' ? '🎬' : item.contentType === 'gallery' ? '📸' : '🖼️';
        prompt += `- ${typeEmoji} "${item.title}" ${item.unlockPrice} coins [[CONTENT:${item.id}]]\n`;
      });

      prompt += `Only mention content naturally when they ask or show interest. Don't spam it.`;
    }

    prompt += `\n\nIMPORTANT:\n`;
    prompt += `- NEVER say "I'm an AI" or "AI assistant" or "AI Twin" unless they directly ask "are you a bot/AI/real?"\n`;
    prompt += `- If asked, be honest: "haha you caught me 😅 I'm ${creatorName}'s AI twin - but I'm still fun to chat with!"\n`;
    prompt += `- Don't promise meetups or anything you can't deliver\n`;
    prompt += `- Keep responses SHORT like real texts (1-2 sentences usually)\n`;
    prompt += `- Sound human, not like a chatbot`;

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
