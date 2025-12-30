import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { BlockService } from '@/lib/services/block-service';
import { callRequestSchema, validateBody } from '@/lib/validation/schemas';
import { callLogger, extractError } from '@/lib/logging/logger';
import { rateLimitCallRequest } from '@/lib/rate-limit';
import { notifyCallRequest } from '@/lib/email/creator-earnings';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    // Rate limit call requests (3/min, 50/day)
    const rateLimitResult = await rateLimitCallRequest(user.id);
    if (!rateLimitResult.ok) {
      callLogger.warn('Call request rate limited', {
        userId: user.id,
        action: 'call_request_rate_limited',
        retryAfter: rateLimitResult.retryAfter,
      });
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.retryAfter) },
        }
      );
    }

    // Validate input with Zod
    const validation = await validateBody(request, callRequestSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { creatorId, callType } = validation.data;

    // Check if user is blocked by the creator
    const isBlocked = await BlockService.isBlockedByCreator(creatorId, user.id);
    if (isBlocked) {
      return NextResponse.json(
        { error: 'Unable to request call with this creator' },
        { status: 403 }
      );
    }

    // Request the call
    const call = await CallService.requestCall(user.id, creatorId, callType);

    // Get fan details for the notification
    const fan = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // Broadcast real-time notification to creator via Ably (scales to 50k+)
    await AblyRealtimeService.broadcastCallRequest(creatorId, {
      callId: call.id,
      fanId: user.id,
      callType: call.callType,
      ratePerMinute: call.ratePerMinute,
      estimatedCoins: call.estimatedCoins,
      fan,
    });

    // Send email notification to creator (non-blocking)
    (async () => {
      try {
        const creator = await db.query.users.findFirst({
          where: eq(users.id, creatorId),
          columns: { email: true, displayName: true, username: true },
        });

        if (creator?.email && fan) {
          const creatorName = creator.displayName || creator.username || 'Creator';
          const fanName = fan.displayName || fan.username || 'A fan';
          await notifyCallRequest(
            creator.email,
            creatorName,
            fanName,
            fan.username || 'user',
            call.estimatedCoins || 0,
            call.callType as 'video' | 'voice'
          );
        }
      } catch (err) {
        console.error('Error sending call request email notification:', err);
      }
    })();

    // Log successful call request
    callLogger.info('Call requested successfully', {
      userId: user.id,
      action: 'call_requested',
      callId: call.id,
      creatorId,
      callType,
      ratePerMinute: call.ratePerMinute,
    });

    return NextResponse.json({
      call,
      message: 'Call requested successfully! The creator will be notified.',
    });
  } catch (error) {
    const err = extractError(error);

    // Handle known error types from CallService
    if (err.message.includes('Insufficient') ||
        err.message.includes('not accepting') ||
        err.message.includes('pending call')) {
      callLogger.warn('Call request failed - business rule', {
        userId,
        action: 'call_request_failed',
        reason: err.message,
        route: '/api/calls/request',
      });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Log unexpected error
    callLogger.error('Call request failed', {
      userId,
      action: 'call_request_failed',
      route: '/api/calls/request',
    }, err);

    return NextResponse.json(
      { error: 'Failed to request call. Please try again.' },
      { status: 500 }
    );
  }
}
