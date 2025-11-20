import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { NotificationService } from '@/lib/services/notification-service';
import { createClient } from '@/lib/supabase/server';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM (used by StreamService)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[STREAMS/CREATE]', { requestId, error: 'Auth failed' });
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    const { title, description, category, privacy, thumbnail_url, scheduled_at } = await req.json();

    if (!title) {
      return NextResponse.json(
        failure('Title is required', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    if (!category) {
      return NextResponse.json(
        failure('Category is required', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Parse scheduled date if provided
    const scheduledAt = scheduled_at ? new Date(scheduled_at) : undefined;

    console.log('[STREAMS/CREATE]', {
      requestId,
      userId: user.id,
      title,
      category,
      privacy,
      scheduled: !!scheduledAt,
    });

    // Create stream with timeout and retry
    try {
      const stream = await withTimeoutAndRetry(
        () => StreamService.createStream(
          user.id,
          title,
          description,
          category,
          privacy,
          thumbnail_url,
          scheduledAt
        ),
        {
          timeoutMs: 8000,
          retries: 1, // Only 1 retry for writes to avoid duplicates
          tag: 'createStream'
        }
      );

      console.log('[STREAMS/CREATE]', {
        requestId,
        streamId: stream.id,
        status: 'success'
      });

      // Send notifications to followers/subscribers based on privacy level
      // Only send notifications if stream is going live immediately (not scheduled)
      if (!scheduledAt || scheduledAt <= new Date()) {
        // Fire and forget - don't wait for notifications to complete
        NotificationService.notifyStreamStart(
          user.id,
          stream.id,
          title,
          privacy || 'public'
        ).catch((err) => {
          console.error('[STREAMS/CREATE] Failed to send notifications:', err);
        });
      }

      return NextResponse.json(
        success(stream, requestId),
        { status: 201, headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[STREAMS/CREATE]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        userId: user.id,
      });

      return NextResponse.json(
        failure(
          'Failed to create stream - database temporarily unavailable. Please try again in a moment.',
          'db',
          requestId
        ),
        { status: 503, headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[STREAMS/CREATE]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      failure('Failed to create stream - please try again', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
