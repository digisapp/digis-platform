import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/messages/requests - Get pending message requests
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

    // Try to fetch requests with timeout and retry
    try {
      const requests = await withTimeoutAndRetry(
        () => MessageService.getPendingRequests(user.id),
        {
          timeoutMs: 5000,
          retries: 2,
          tag: 'getPendingRequests'
        }
      );

      return NextResponse.json(
        success(requests, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[MESSAGE_REQUESTS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id
      });

      // Return degraded response
      return NextResponse.json(
        degraded([], 'Database temporarily unavailable', 'timeout', requestId),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[MESSAGE_REQUESTS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded([], 'Failed to fetch message requests', 'unknown', requestId),
      { headers: { 'x-request-id': requestId } }
    );
  }
}

// POST /api/messages/requests - Create a message request
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

    const { toUserId, initialMessage, isPaid, paidAmount } = await request.json();

    if (!toUserId || !initialMessage) {
      return NextResponse.json(
        { error: 'Recipient ID and initial message are required' },
        { status: 400 }
      );
    }

    const messageRequest = await MessageService.createMessageRequest(
      user.id,
      toUserId,
      initialMessage,
      isPaid || false,
      paidAmount || 0
    );

    return NextResponse.json({ request: messageRequest });
  } catch (error: any) {
    console.error('Error creating message request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create message request' },
      { status: 500 }
    );
  }
}
