import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { RealtimeService } from '@/lib/streams/realtime-service';
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

    // Check access control before allowing join
    const accessCheck = await StreamService.checkStreamAccess(streamId, user.id);

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.reason || 'Access denied' },
        { status: 403 }
      );
    }

    // Get user details for username
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const username = dbUser.username || dbUser.displayName || 'Anonymous';

    const viewer = await StreamService.joinStream(streamId, user.id, username);

    // Broadcast viewer joined event
    await RealtimeService.broadcastViewerJoined(streamId, user.id, username);

    // Get updated viewer count and broadcast
    const stream = await StreamService.getStream(streamId);
    if (stream) {
      await RealtimeService.broadcastViewerCount(
        streamId,
        stream.currentViewers,
        stream.peakViewers
      );
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
