import { NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/streams/active
 * Check if the current user has an active live stream
 */
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

    const activeStream = await StreamService.getActiveStream(user.id);

    return NextResponse.json(
      success({
        hasActiveStream: !!activeStream,
        stream: activeStream || null,
      }, requestId),
      { status: 200, headers: { 'x-request-id': requestId } }
    );
  } catch (error: any) {
    console.error('[STREAMS/ACTIVE]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      failure('Failed to check active stream', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
