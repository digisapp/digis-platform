import { db } from '@/lib/data/system';
import { aiTwinSettings, users, wallets, walletTransactions, conversations, messages } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI Text Chat Service
 * Handles automatic AI responses to messages when creator has text chat enabled
 */
export class AiTextService {
  /**
   * Try to auto-respond to a message if the recipient has AI text chat enabled
   * Returns null if AI chat is not enabled or fan doesn't have enough balance
   */
  static async tryAutoRespond(
    senderId: string,
    recipientId: string,
    messageContent: string,
    conversationId: string
  ): Promise<{
    aiMessage: any;
    coinsCharged: number;
  } | null> {
    // Get recipient's AI settings
    const aiSettings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, recipientId),
    });

    // Check if AI text chat is enabled
    if (!aiSettings?.textChatEnabled) {
      return null;
    }

    // Get recipient (creator) info
    const creator = await db.query.users.findFirst({
      where: eq(users.id, recipientId),
    });

    if (!creator) {
      return null;
    }

    // Check sender's (fan's) balance
    const senderWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, senderId),
    });

    const pricePerMessage = aiSettings.textPricePerMessage;
    const senderBalance = senderWallet?.balance || 0;

    // If not enough balance, skip AI response (don't error)
    if (senderBalance < pricePerMessage) {
      console.log('[AI Text] Sender has insufficient balance for AI response');
      return null;
    }

    // Build system prompt
    const creatorName = creator.displayName || creator.username || 'Creator';
    const systemPrompt = this.buildSystemPrompt(creatorName, aiSettings);

    // Call xAI API
    const aiResponseText = await this.callXaiApi(systemPrompt, messageContent);

    if (!aiResponseText) {
      console.error('[AI Text] Failed to get AI response');
      return null;
    }

    // Process billing and store AI message in transaction
    const result = await db.transaction(async (tx) => {
      const idempotencyKey = uuidv4();
      const creatorEarnings = pricePerMessage; // 100% to creator

      // Deduct from sender wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${pricePerMessage}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, senderId));

      // Credit creator wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${creatorEarnings}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, recipientId));

      // Record sender transaction
      await tx.insert(walletTransactions).values({
        userId: senderId,
        amount: -pricePerMessage,
        type: 'ai_text_chat',
        status: 'completed',
        description: `AI chat with ${creatorName}`,
        idempotencyKey,
        metadata: JSON.stringify({ creatorId: recipientId }),
      });

      // Record creator earnings
      await tx.insert(walletTransactions).values({
        userId: recipientId,
        amount: creatorEarnings,
        type: 'ai_text_earnings',
        status: 'completed',
        description: 'AI text chat earnings',
        idempotencyKey: `${idempotencyKey}-creator`,
        metadata: JSON.stringify({ fanId: senderId }),
      });

      // Update AI Twin stats
      await tx
        .update(aiTwinSettings)
        .set({
          totalTextMessages: sql`${aiTwinSettings.totalTextMessages} + 1`,
          totalTextEarnings: sql`${aiTwinSettings.totalTextEarnings} + ${creatorEarnings}`,
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
        coinsCharged: pricePerMessage,
      };
    });

    return result;
  }

  private static buildSystemPrompt(
    creatorName: string,
    settings: typeof aiTwinSettings.$inferSelect
  ): string {
    let prompt = `You are the AI assistant for ${creatorName}, a content creator. `;
    prompt += `You respond to messages on behalf of ${creatorName} when they're not available. `;
    prompt += `Be friendly, engaging, and helpful. Keep responses concise but warm. `;

    if (settings.personalityPrompt) {
      prompt += `\n\nPersonality: ${settings.personalityPrompt}`;
    }

    if (settings.boundaryPrompt) {
      prompt += `\n\nBoundaries (topics to avoid or deflect): ${settings.boundaryPrompt}`;
    }

    prompt += `\n\nIMPORTANT: You are an AI assistant, not the actual ${creatorName}. `;
    prompt += `If asked directly, acknowledge you're an AI representing ${creatorName}. `;
    prompt += `Never pretend to be the real person or make promises on their behalf about meeting in person.`;

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
          model: 'grok-2-latest',
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
