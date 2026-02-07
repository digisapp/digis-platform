import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';
import { AccessToken } from 'livekit-server-sdk';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
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

    // Parallel fetch: stream details, access check, user details
    const [stream, accessCheck, dbUser] = await Promise.all([
      StreamService.getStream(streamId),
      StreamService.checkStreamAccess(streamId, user.id),
      db.query.users.findFirst({
        where: eq(users.id, user.id),
      }),
    ]);

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.status !== 'live') {
      return NextResponse.json({ error: 'Stream is not live' }, { status: 400 });
    }

    // Check access control (subscribers-only, followers-only, ticketed, etc.)
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.reason || 'Access denied' },
        { status: 403 }
      );
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const username = dbUser.username || dbUser.displayName || 'Anonymous';

    // Create LiveKit token for viewer (6 hour TTL for long streams)
    const SIX_HOURS = 6 * 60 * 60;
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: user.id,
        name: username,
        ttl: SIX_HOURS,
      }
    );

    // Viewers can only subscribe (watch)
    at.addGrant({
      roomJoin: true,
      room: stream.roomName,
      canPublish: false,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      roomName: stream.roomName,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error: any) {
    console.error('Error generating viewer token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}
