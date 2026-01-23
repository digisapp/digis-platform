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
  let conversationId = 'unknown';
  let step = 'init';

  try {
    // Step 1: Parse params
    step = 'parse-params';
    const resolvedParams = await params;
    conversationId = resolvedParams.conversationId;

    console.log('[Messages API] Step 1: Params parsed', { conversationId });

    // Step 2: Create Supabase client
    step = 'create-supabase-client';
    const supabase = await createClient();

    console.log('[Messages API] Step 2: Supabase client created');

    // Step 3: Get authenticated user
    step = 'get-user';
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[Messages API] Auth error:', authError.message);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.error('[Messages API] No user found');
      return NextResponse.json(
        { error: 'Unauthorized - no user session' },
        { status: 401 }
      );
    }

    console.log('[Messages API] Step 3: User authenticated', { userId: user.id });

    // Step 4: Parse query params
    step = 'parse-query-params';
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const cursor = searchParams.get('cursor');
    const useCursor = searchParams.has('useCursor');
    const direction = (searchParams.get('direction') as 'older' | 'newer') || 'older';

    console.log('[Messages API] Step 4: Query params parsed', {
      limit,
      cursor: cursor || 'null',
      useCursor,
      direction,
    });

    // Step 5: Fetch messages
    step = 'fetch-messages';

    // Use cursor-based pagination if cursor is provided or explicitly requested
    if (cursor || useCursor) {
      console.log('[Messages API] Step 5a: Using cursor-based pagination');

      const result = await MessageService.getMessagesCursor(
        conversationId,
        user.id,
        limit,
        cursor || undefined,  // undefined means "first page"
        direction
      );

      console.log('[Messages API] Step 5a: Messages fetched', {
        count: result.messages.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor ? 'present' : 'null',
      });

      return NextResponse.json({
        messages: result.messages,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    }

    // Legacy offset-based pagination
    console.log('[Messages API] Step 5b: Using offset-based pagination');
    const offset = parseInt(searchParams.get('offset') || '0');
    const messages = await MessageService.getMessages(conversationId, user.id, limit, offset);

    console.log('[Messages API] Step 5b: Messages fetched', { count: messages.length });

    return NextResponse.json({ messages });
  } catch (error: any) {
    // Detailed error logging
    console.error('[Messages API] ERROR at step:', step, {
      conversationId,
      error: error?.message || String(error),
      errorName: error?.name,
      errorCode: error?.code,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),  // First 5 lines of stack
    });

    // Return detailed error for debugging (can be removed in production)
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch messages',
        errorType: error?.name || 'UnknownError',
        step,
        conversationId,
      },
      { status: 500 }
    );
  }
}
