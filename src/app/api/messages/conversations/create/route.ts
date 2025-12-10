import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/messages/conversations/create - Create or get existing conversation
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Cannot create conversation with yourself' }, { status: 400 });
    }

    // Get or create conversation without sending any message
    const conversation = await MessageService.getOrCreateConversation(user.id, recipientId);

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      conversation,
    });
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
