import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/messages/conversations/[conversationId]/details - Get single conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const conversation = await MessageService.getConversationById(conversationId, user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('Error fetching conversation details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation details' },
      { status: 500 }
    );
  }
}
