import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { MessageService } from '@/lib/messages/message-service';
import { sendMessageSchema, validateBody } from '@/lib/validation/schemas';
import { AiTextService } from '@/lib/services/ai-text-service';

// POST /api/messages/send - Send a message
export async function POST(request: NextRequest) {
  try {
    // Rate limit to prevent spam
    const rateLimitResult = await rateLimit(request, 'messages:send');
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: 'Too many messages. Please slow down.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate input with Zod
    const validation = await validateBody(request, sendMessageSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { recipientId, content, mediaUrl, mediaType, replyToId } = validation.data;

    // Get or create conversation
    const conversation = await MessageService.getOrCreateConversation(
      user.id,
      recipientId
    );

    // Send message
    const message = await MessageService.sendMessage(
      conversation.id,
      user.id,
      content,
      mediaUrl,
      mediaType,
      replyToId
    );

    // Check if recipient has AI text chat enabled and auto-respond
    let aiResponse = null;
    try {
      console.log('[AI Text] Attempting auto-respond for recipient:', recipientId);
      aiResponse = await AiTextService.tryAutoRespond(
        user.id,
        recipientId,
        content,
        conversation.id
      );
      console.log('[AI Text] Auto-respond result:', aiResponse ? 'AI responded' : 'No AI response (disabled or error)');
    } catch (aiError) {
      // Don't fail the whole request if AI fails - just log it
      console.error('[AI Text] Auto-respond error:', aiError);
    }

    return NextResponse.json({
      message,
      conversationId: conversation.id,
      aiResponse: aiResponse ? {
        message: aiResponse.aiMessage,
      } : null,
    });
  } catch (error) {
    // Log full error server-side, return generic message to client
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
