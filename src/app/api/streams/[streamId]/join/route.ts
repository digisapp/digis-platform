import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await params;

    // Parallel fetch: user details + access check (reduces N+1)
    const [dbUser, accessCheck] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, user.id),
      }),
      StreamService.checkStreamAccess(streamId, user.id),
    ]);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.reason || 'Access denied' },
        { status: 403 }
      );
    }

    const username = dbUser.username || dbUser.displayName || 'Anonymous';

    // Join stream and get updated stream data
    const [viewer, stream] = await Promise.all([
      StreamService.joinStream(streamId, user.id, username),
      StreamService.getStream(streamId),
    ]);

    // Broadcast events in parallel (non-blocking)
    if (stream) {
      Promise.all([
        AblyRealtimeService.broadcastViewerJoined(streamId, user.id, username),
        AblyRealtimeService.broadcastViewerCount(
          streamId,
          stream.currentViewers || 0,
          stream.peakViewers || 0
        ),
      ]).catch(err => console.error('[stream/join] Broadcast error:', err));
    }

    return NextResponse.json({ viewer });
  } catch (error: any) {
    console.error('Error joining stream:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join stream' },
      { status: 500 }
    );
  }
}
