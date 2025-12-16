import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { NotificationService } from '@/lib/services/notification-service';
import { createClient } from '@/lib/supabase/server';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

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

    // Verify user is a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      console.error('[STREAMS/CREATE]', { requestId, error: 'Not a creator', role: dbUser?.role });
      return NextResponse.json(
        failure('Only creators can create streams', 'auth', requestId),
        { status: 403, headers: { 'x-request-id': requestId } }
      );
    }

    const { title, description, privacy, thumbnail_url, scheduled_at, orientation, featuredCreatorCommission, ticketPrice, goPrivateEnabled, goPrivateRate, goPrivateMinDuration } = await req.json();

    if (!title) {
      return NextResponse.json(
        failure('Title is required', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Parse scheduled date if provided
    const scheduledAt = scheduled_at ? new Date(scheduled_at) : undefined;

    console.log('[STREAMS/CREATE]', {
      requestId,
      userId: user.id,
      title,
      privacy,
      orientation: orientation || 'landscape',
      scheduled: !!scheduledAt,
      featuredCreatorCommission: featuredCreatorCommission || 0,
      ticketPrice: privacy === 'ticketed' ? ticketPrice : null,
    });

    // Check for existing active stream first
    const existingStream = await StreamService.getActiveStream(user.id);
    if (existingStream) {
      console.log('[STREAMS/CREATE]', {
        requestId,
        streamId: existingStream.id,
        status: 'existing_stream_returned'
      });

      return NextResponse.json(
        success({ ...existingStream, wasExisting: true }, requestId),
        { status: 200, headers: { 'x-request-id': requestId } }
      );
    }

    // Create stream with timeout and retry
    try {
      const stream = await withTimeoutAndRetry(
        () => StreamService.createStream(
          user.id,
          title,
          description,
          privacy,
          thumbnail_url,
          scheduledAt,
          orientation || 'landscape',
          featuredCreatorCommission || 0,
          privacy === 'ticketed' ? ticketPrice : undefined,
          goPrivateEnabled ?? true,
          goPrivateRate,
          goPrivateMinDuration
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
        status: 'new_stream_created'
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
