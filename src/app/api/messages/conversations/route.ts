import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/messages/conversations - Get all conversations for user
export async function GET() {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    // Try to fetch conversations with timeout and retry
    try {
      const conversations = await withTimeoutAndRetry(
        () => MessageService.getUserConversations(user.id),
        {
          timeoutMs: 5000,
          retries: 2,
          tag: 'getUserConversations'
        }
      );

      // Filter out:
      // 1. Conversations with null otherUser (edge case where user was deleted)
      // 2. Conversations with no messages (empty conversations that were auto-created)
      const validConversations = conversations.filter(c =>
        c.otherUser !== null &&
        c.otherUser !== undefined &&
        c.lastMessageAt !== null // Only show conversations that have at least one message
      );

      return NextResponse.json(
        success(validConversations, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[CONVERSATIONS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id
      });

      // Return degraded response instead of failing completely
      return NextResponse.json(
        degraded([], 'Database temporarily unavailable - showing cached data', 'timeout', requestId),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[CONVERSATIONS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded([], 'Failed to fetch conversations', 'unknown', requestId),
      { headers: { 'x-request-id': requestId } }
    );
  }
}
