import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { streams } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

/**
 * Broadcaster heartbeat - updates lastHeartbeat timestamp
 * If no heartbeat received for 60 seconds, stream can be auto-ended
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ streamId: string }> }
) {
  try {
    const params = await context.params;
    const { streamId } = params;

    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update heartbeat only if user is the creator and stream is live
    const result = await db.update(streams)
      .set({ lastHeartbeat: new Date() })
      .where(
        and(
          eq(streams.id, streamId),
          eq(streams.creatorId, user.id),
          eq(streams.status, 'live')
        )
      )
      .returning({ id: streams.id });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Stream not found or not live' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
