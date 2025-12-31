import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { aiTwinSettings, users, wallets, walletTransactions, conversations, messages, creatorSettings } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// Platform fee for AI text chat (configurable, defaults to 0% - creator gets 100%)
const PLATFORM_FEE_PERCENT = parseInt(process.env.AI_TEXT_PLATFORM_FEE_PERCENT || '0', 10);

/**
 * POST /api/ai/text
 *
 * Send a message to a creator's AI Twin and get a response.
 * Charges the fan coins per message.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, message, conversationId } = await request.json();

    if (!creatorId || !message) {
      return NextResponse.json(
        { error: 'Creator ID and message are required' },
        { status: 400 }
      );
    }

    // Can't chat with yourself
    if (creatorId === user.id) {
      return NextResponse.json(
        { error: 'Cannot chat with your own AI' },
        { status: 400 }
      );
    }

    // Get creator's AI settings
    const aiSettings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!aiSettings?.textChatEnabled) {
      return NextResponse.json(
        { error: 'This creator has not enabled AI text chat' },
        { status: 400 }
      );
    }

    // Get creator info
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Get creator's message rate from creatorSettings (same rate as regular messages)
    const creatorSetting = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, creatorId),
    });

    // Check fan's balance
    const fanWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    // Use messageRate from creatorSettings (same as regular messages)
    const pricePerMessage = creatorSetting?.messageRate || 0;
    const fanBalance = fanWallet?.balance || 0;

    if (fanBalance < pricePerMessage) {
      return NextResponse.json(
        { error: 'Insufficient balance', required: pricePerMessage, balance: fanBalance },
        { status: 402 }
      );
    }

    // Build the system prompt
    const creatorName = creator.displayName || creator.username || 'Creator';
    const systemPrompt = buildSystemPrompt(creatorName, aiSettings);

    // Call xAI API
    const aiResponse = await callXaiApi(systemPrompt, message);

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }

    // Process billing and store messages in a transaction
    const result = await db.transaction(async (tx) => {
      const idempotencyKey = uuidv4();
      const creatorEarnings = pricePerMessage; // 100% to creator for now

      // Deduct from fan wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${pricePerMessage}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, user.id));

      // Credit creator wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${creatorEarnings}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, creatorId));

      // Record fan transaction
      await tx.insert(walletTransactions).values({
        userId: user.id,
        amount: -pricePerMessage,
        type: 'ai_text_chat',
        status: 'completed',
        description: `AI text chat with ${creatorName}`,
        idempotencyKey,
        metadata: JSON.stringify({ creatorId, messagePreview: message.substring(0, 50) }),
      });

      // Record creator earnings
      await tx.insert(walletTransactions).values({
        userId: creatorId,
        amount: creatorEarnings,
        type: 'ai_text_earnings',
        status: 'completed',
        description: `AI text chat earnings`,
        idempotencyKey: `${idempotencyKey}-creator`,
        metadata: JSON.stringify({ fanId: user.id }),
      });

      // Update AI Twin stats
      await tx
        .update(aiTwinSettings)
        .set({
          totalTextMessages: sql`${aiTwinSettings.totalTextMessages} + 1`,
          totalTextEarnings: sql`${aiTwinSettings.totalTextEarnings} + ${creatorEarnings}`,
          updatedAt: new Date(),
        })
        .where(eq(aiTwinSettings.creatorId, creatorId));

      // Get or create conversation
      let convoId = conversationId;
      if (!convoId) {
        // Check for existing conversation
        const existingConvo = await tx.query.conversations.findFirst({
          where: or(
            and(eq(conversations.user1Id, user.id), eq(conversations.user2Id, creatorId)),
            and(eq(conversations.user1Id, creatorId), eq(conversations.user2Id, user.id))
          ),
        });

        if (existingConvo) {
          convoId = existingConvo.id;
        } else {
          // Create new conversation
          const [newConvo] = await tx
            .insert(conversations)
            .values({
              user1Id: user.id,
              user2Id: creatorId,
            })
            .returning();
          convoId = newConvo.id;
        }
      }

      // Store fan's message
      const [fanMessage] = await tx
        .insert(messages)
        .values({
          conversationId: convoId,
          senderId: user.id,
          content: message,
        })
        .returning();

      // Store AI response (as if from creator, but marked as AI)
      const [aiMessage] = await tx
        .insert(messages)
        .values({
          conversationId: convoId,
          senderId: creatorId,
          content: aiResponse,
          isAiGenerated: true,
        })
        .returning();

      // Update conversation's last message
      await tx
        .update(conversations)
        .set({
          lastMessageText: aiResponse.substring(0, 100),
          lastMessageAt: new Date(),
          lastMessageSenderId: creatorId,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, convoId));

      return {
        conversationId: convoId,
        fanMessageId: fanMessage.id,
        aiMessageId: aiMessage.id,
        aiResponse,
        coinsCharged: pricePerMessage,
        remainingBalance: fanBalance - pricePerMessage,
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[AI Text Chat] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI text chat' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(creatorName: string, settings: typeof aiTwinSettings.$inferSelect): string {
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

async function callXaiApi(systemPrompt: string, userMessage: string): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  const timeoutMs = parseInt(process.env.XAI_API_TIMEOUT_MS || '30000', 10);

  if (!apiKey) {
    console.error('[AI Text Chat] XAI_API_KEY not configured');
    throw new Error('AI service not configured');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Text Chat] xAI API error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[AI Text Chat] xAI API request timed out');
      throw new Error('AI service timed out');
    }
    console.error('[AI Text Chat] Error calling xAI:', error);
    throw error;
  }
}
