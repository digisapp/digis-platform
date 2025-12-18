import { db } from '@/lib/data/system';
import { aiTwinSettings, users, streams, streamMessages } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

// In-memory cooldown tracking (per stream)
const streamCooldowns = new Map<string, number>();
const COOLDOWN_MS = 8000; // 8 seconds between AI messages

// Track recent AI responses to avoid repetition
const recentResponses = new Map<string, string[]>();
const MAX_RECENT_RESPONSES = 10;

/**
 * AI Stream Chat Moderator Service
 * Automatically responds to chat messages during live streams
 */
export class AiStreamChatService {
  /**
   * Process a chat message and potentially respond with AI
   * Returns true if AI responded, false otherwise
   */
  static async processMessage(
    streamId: string,
    creatorId: string,
    message: {
      id: string;
      userId: string | null;
      username: string;
      message: string;
      messageType: 'chat' | 'system' | 'gift' | 'tip';
      giftAmount?: number | null;
    }
  ): Promise<boolean> {
    // Check if AI chat mod is enabled for this creator
    const aiSettings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!aiSettings?.streamChatModEnabled) {
      return false;
    }

    // Don't respond to own AI messages
    if (message.userId === creatorId) {
      return false;
    }

    // Check cooldown
    const lastResponse = streamCooldowns.get(streamId) || 0;
    if (Date.now() - lastResponse < COOLDOWN_MS) {
      return false;
    }

    // Determine if we should respond and what type of response
    const responseType = this.shouldRespond(message);
    if (!responseType) {
      return false;
    }

    // Get creator info
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
      columns: {
        displayName: true,
        username: true,
      },
    });

    const creatorName = creator?.displayName || creator?.username || 'Creator';

    // Generate AI response
    const response = await this.generateResponse(
      creatorName,
      aiSettings,
      message,
      responseType,
      streamId
    );

    if (!response) {
      return false;
    }

    // Update cooldown
    streamCooldowns.set(streamId, Date.now());

    // Save and broadcast AI message
    await this.sendAiMessage(streamId, creatorId, creatorName, response);

    // Update stats
    await db
      .update(aiTwinSettings)
      .set({
        totalStreamChatMessages: sql`${aiTwinSettings.totalStreamChatMessages} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(aiTwinSettings.creatorId, creatorId));

    return true;
  }

  /**
   * Process a tip/gift and thank the user
   */
  static async processTip(
    streamId: string,
    creatorId: string,
    tipperUsername: string,
    amount: number,
    giftName?: string
  ): Promise<boolean> {
    const aiSettings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!aiSettings?.streamChatModEnabled) {
      return false;
    }

    // Always thank tippers (skip cooldown for tips)
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
      columns: {
        displayName: true,
        username: true,
      },
    });

    const creatorName = creator?.displayName || creator?.username || 'Creator';

    // Generate thank you message
    const response = await this.generateTipThankYou(
      creatorName,
      aiSettings,
      tipperUsername,
      amount,
      giftName
    );

    if (!response) {
      return false;
    }

    await this.sendAiMessage(streamId, creatorId, creatorName, response);

    await db
      .update(aiTwinSettings)
      .set({
        totalStreamChatMessages: sql`${aiTwinSettings.totalStreamChatMessages} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(aiTwinSettings.creatorId, creatorId));

    return true;
  }

  /**
   * Determine if AI should respond to this message
   */
  private static shouldRespond(message: {
    message: string;
    messageType: string;
    giftAmount?: number | null;
  }): 'greeting' | 'question' | 'engagement' | 'tip' | null {
    const text = message.message.toLowerCase();

    // Always respond to tips/gifts
    if (message.messageType === 'tip' || message.messageType === 'gift') {
      return 'tip';
    }

    // Greetings
    if (/^(hey|hi|hello|hii+|heyy+|what'?s? ?up|sup|yo)\b/i.test(text)) {
      // Only respond to some greetings (30% chance)
      if (Math.random() < 0.3) {
        return 'greeting';
      }
    }

    // Questions (higher response rate - 60%)
    if (text.includes('?') || /^(how|what|when|where|why|who|can you|do you|are you|will you)/i.test(text)) {
      if (Math.random() < 0.6) {
        return 'question';
      }
    }

    // General engagement (10% chance for other messages)
    if (Math.random() < 0.1) {
      return 'engagement';
    }

    return null;
  }

  /**
   * Generate an AI response using xAI
   */
  private static async generateResponse(
    creatorName: string,
    settings: typeof aiTwinSettings.$inferSelect,
    message: { username: string; message: string },
    responseType: 'greeting' | 'question' | 'engagement' | 'tip',
    streamId: string
  ): Promise<string | null> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return null;

    const systemPrompt = this.buildStreamChatPrompt(creatorName, settings, responseType);

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
            { role: 'user', content: `@${message.username}: ${message.message}` },
          ],
          max_tokens: 100, // Short for stream chat
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        console.error('[AI Stream Chat] API error:', response.status);
        return null;
      }

      const data = await response.json();
      let aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) return null;

      // Check for repetition
      const recent = recentResponses.get(streamId) || [];
      if (recent.includes(aiResponse)) {
        return null; // Skip if we've said this recently
      }

      // Track response
      recent.push(aiResponse);
      if (recent.length > MAX_RECENT_RESPONSES) {
        recent.shift();
      }
      recentResponses.set(streamId, recent);

      return aiResponse;
    } catch (error) {
      console.error('[AI Stream Chat] Error:', error);
      return null;
    }
  }

  /**
   * Generate a thank you message for tips/gifts
   */
  private static async generateTipThankYou(
    creatorName: string,
    settings: typeof aiTwinSettings.$inferSelect,
    tipperUsername: string,
    amount: number,
    giftName?: string
  ): Promise<string | null> {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return null;

    const giftText = giftName ? `sent a ${giftName}` : `tipped ${amount} coins`;

    const systemPrompt = `You ARE ${creatorName}, a content creator live streaming. Someone just ${giftText}!

RESPOND with a SHORT, EXCITED thank you (under 15 words). Be genuine and use their username.
${settings.personalityPrompt ? `\nYour personality: ${settings.personalityPrompt}` : ''}

Examples:
- "omggg thank you @username!! 💕"
- "@username you're amazing!! 🥰🔥"
- "ahhh @username thank you so much babe!! 💖"
- "@username!! you're the best 😍"`;

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
            { role: 'user', content: `@${tipperUsername} just ${giftText}!` },
          ],
          max_tokens: 50,
          temperature: 0.9,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  /**
   * Build the system prompt for stream chat
   */
  private static buildStreamChatPrompt(
    creatorName: string,
    settings: typeof aiTwinSettings.$inferSelect,
    responseType: 'greeting' | 'question' | 'engagement' | 'tip'
  ): string {
    let prompt = `You ARE ${creatorName}, currently LIVE STREAMING. You're chatting with viewers in real-time.\n\n`;

    prompt += `RULES:\n`;
    prompt += `- Keep responses SHORT (under 20 words) - it's live chat!\n`;
    prompt += `- Be warm, energetic, and engaging\n`;
    prompt += `- Use the viewer's @username when responding\n`;
    prompt += `- Use emojis naturally\n`;
    prompt += `- Match the energy of a live stream\n`;
    prompt += `- NEVER say you're an AI or bot\n`;

    if (settings.personalityPrompt) {
      prompt += `\nYour personality: ${settings.personalityPrompt}\n`;
    }

    if (settings.boundaryPrompt) {
      prompt += `\nTopics to avoid: ${settings.boundaryPrompt}\n`;
    }

    if (responseType === 'greeting') {
      prompt += `\nThis is a GREETING - welcome them warmly! Examples:\n`;
      prompt += `- "heyy @username! 💕"\n`;
      prompt += `- "welcome @username! 🥰"\n`;
      prompt += `- "@username!! glad you're here 😊"\n`;
    } else if (responseType === 'question') {
      prompt += `\nThis is a QUESTION - answer helpfully but briefly. If you don't know, deflect playfully.\n`;
    } else if (responseType === 'engagement') {
      prompt += `\nThis is general ENGAGEMENT - react to what they said naturally.\n`;
    }

    return prompt;
  }

  /**
   * Save and broadcast an AI message
   */
  private static async sendAiMessage(
    streamId: string,
    creatorId: string,
    creatorName: string,
    message: string
  ): Promise<void> {
    // Get creator's avatar
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
      columns: {
        avatarUrl: true,
        spendTier: true,
      },
    });

    // Save to database
    const [savedMessage] = await db.insert(streamMessages).values({
      streamId,
      userId: creatorId,
      username: creatorName,
      message,
      messageType: 'chat',
      isAiGenerated: true,
    }).returning();

    // Broadcast via Ably
    const messagePayload = {
      id: savedMessage.id,
      streamId: savedMessage.streamId,
      userId: savedMessage.userId,
      username: creatorName,
      message: savedMessage.message,
      messageType: savedMessage.messageType,
      createdAt: savedMessage.createdAt,
      isAiGenerated: true,
      user: {
        avatarUrl: creator?.avatarUrl,
        spendTier: creator?.spendTier,
      },
    };

    await AblyRealtimeService.broadcastChatMessage(streamId, messagePayload as any);

    console.log(`[AI Stream Chat] Sent: "${message}"`);
  }

  /**
   * Clean up cooldowns for ended streams
   */
  static cleanupStream(streamId: string): void {
    streamCooldowns.delete(streamId);
    recentResponses.delete(streamId);
  }
}
