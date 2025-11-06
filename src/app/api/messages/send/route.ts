import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

// POST /api/messages/send - Send a message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipientId, content, mediaUrl, mediaType } = body;

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: 'Recipient ID and content are required' },
        { status: 400 }
      );
    }

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
      mediaType
    );

    return NextResponse.json({
      message,
      conversationId: conversation.id,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
