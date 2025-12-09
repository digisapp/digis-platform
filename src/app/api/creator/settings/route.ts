import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM (used by CallService)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    console.log('[CREATOR_SETTINGS]', {
      requestId,
      userId: user.id,
      action: 'fetch'
    });

    try {
      const settings = await withTimeoutAndRetry(
        () => CallService.getCreatorSettings(user.id),
        {
          timeoutMs: 5000,
          retries: 2,
          tag: 'getCreatorSettings'
        }
      );

      return NextResponse.json(
        success({ settings }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[CREATOR_SETTINGS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id
      });

      // Return degraded response with default settings
      return NextResponse.json(
        degraded(
          { settings: null },
          'Settings temporarily unavailable - please try again in a moment',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[CREATOR_SETTINGS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      degraded(
        { settings: null },
        'Failed to fetch settings - please try again',
        'unknown',
        requestId
      ),
      { headers: { 'x-request-id': requestId } }
    );
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function PATCH(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    const updates = await request.json();

    // Validate updates
    if (updates.callRatePerMinute !== undefined && updates.callRatePerMinute < 1) {
      return NextResponse.json(
        failure('Video call rate must be at least 1 coin per minute', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    if (updates.minimumCallDuration !== undefined && updates.minimumCallDuration < 1) {
      return NextResponse.json(
        failure('Minimum video call duration must be at least 1 minute', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    if (updates.voiceCallRatePerMinute !== undefined && updates.voiceCallRatePerMinute < 1) {
      return NextResponse.json(
        failure('Voice call rate must be at least 1 coin per minute', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    if (updates.minimumVoiceCallDuration !== undefined && updates.minimumVoiceCallDuration < 1) {
      return NextResponse.json(
        failure('Minimum voice call duration must be at least 1 minute', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    if (updates.messageRate !== undefined && updates.messageRate < 1) {
      return NextResponse.json(
        failure('Message rate must be at least 1 coin', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    console.log('[CREATOR_SETTINGS]', {
      requestId,
      userId: user.id,
      action: 'update',
      updates
    });

    try {
      const settings = await withTimeoutAndRetry(
        () => CallService.updateCreatorSettings(user.id, updates),
        {
          timeoutMs: 5000,
          retries: 1, // Only 1 retry for writes to avoid duplicate updates
          tag: 'updateCreatorSettings'
        }
      );

      return NextResponse.json(
        success({ settings }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[CREATOR_SETTINGS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id
      });

      return NextResponse.json(
        failure(
          'Failed to update settings - database temporarily unavailable. Please try again in a moment.',
          'db',
          requestId
        ),
        { status: 503, headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[CREATOR_SETTINGS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      failure('Failed to update settings - please try again', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
