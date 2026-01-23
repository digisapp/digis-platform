import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/messages/conversations/[conversationId] - Get messages for a conversation
// Supports cursor-based pagination (recommended) and offset-based (legacy)
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const cursor = searchParams.get('cursor');
    const direction = (searchParams.get('direction') as 'older' | 'newer') || 'older';

    // Use cursor-based pagination if cursor is provided or explicitly requested
    if (cursor || searchParams.has('useCursor')) {
      const result = await MessageService.getMessagesCursor(
        conversationId,
        user.id,
        limit,
        cursor || undefined,
        direction
      );

      return NextResponse.json({
        messages: result.messages,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    }

    // Legacy offset-based pagination
    const offset = parseInt(searchParams.get('offset') || '0');
    const messages = await MessageService.getMessages(conversationId, user.id, limit, offset);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', {
      conversationId: (await params).conversationId,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
