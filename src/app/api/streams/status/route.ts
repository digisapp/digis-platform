import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCreatorByUsername, getCurrentStreamForCreator, hasAccess } from '@/lib/streams';
import { db } from '@/lib/data/system';
import { streams, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { withMiniLock } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CachedStreamData {
  state: 'live' | 'upcoming' | 'ended';
  streamId: string;
  kind: string;
  priceCents: number;
  startsAt: string | null;
  streamTitle: string;
  creatorName: string;
  creatorId: string;
}

export async function GET(req: NextRequest) {
  try {
    // Rate limiting: generous 120 req/min for status polling
    const rl = await rateLimit(req, 'streams:status');
    if (!rl.ok) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: rl.headers
      });
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    // If no username provided, check if current user has an active stream
    if (!username) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.json({ state: 'idle' as const, isLive: false, streamId: null }, { headers: rl.headers });
        }

        // Check for current user's active stream
        const activeStream = await db.query.streams.findFirst({
          where: eq(streams.creatorId, user.id),
          columns: {
            id: true,
            title: true,
            status: true,
          },
          orderBy: (streams, { desc }) => [desc(streams.createdAt)],
        });

        const isLive = activeStream?.status === 'live';
        return NextResponse.json({
          state: isLive ? 'live' : 'idle',
          isLive,
          streamId: isLive ? activeStream?.id : null,
          streamTitle: isLive ? activeStream?.title : null,
        }, { headers: rl.headers });
      } catch {
        return NextResponse.json({ state: 'idle' as const, isLive: false, streamId: null }, { headers: rl.headers });
      }
    }

    // Cache stream data (not user-specific) for 3s - short TTL for real-time status
    const streamData = await withMiniLock<CachedStreamData | null>(
      `status:${username}`,
      async () => {
        const creator = await getCreatorByUsername(username);
        if (!creator) return null;

        const stream = await getCurrentStreamForCreator(creator.id);
        // If no live/upcoming stream, return null (idle state)
        if (!stream || stream.status === 'ended') return null;

        // Fetch full stream details including title
        const streamDetails = await db.query.streams.findFirst({
          where: eq(streams.id, stream.id),
          columns: {
            title: true,
          },
        });

        // Fetch creator details
        const creatorDetails = await db.query.users.findFirst({
          where: eq(users.id, creator.id),
          columns: {
            displayName: true,
            username: true,
          },
        });

        return {
          state: stream.status === 'live' ? 'live' : stream.status === 'scheduled' ? 'upcoming' : 'ended',
          streamId: stream.id,
          kind: stream.kind,
          priceCents: stream.priceCents ?? 0,
          startsAt: stream.startsAt ?? null,
          streamTitle: streamDetails?.title ?? 'Live Stream',
          creatorName: creatorDetails?.displayName || creatorDetails?.username || username,
          creatorId: creator.id,
        };
      },
      3 // 3 second TTL for real-time accuracy
    );

    if (!streamData) {
      return NextResponse.json({ state: 'idle' as const }, { headers: rl.headers });
    }

    // Check user access (NOT cached, user-specific)
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not authenticated, userId stays null
    }

    const stream = await getCurrentStreamForCreator(streamData.creatorId);
    const access = stream ? await hasAccess({ userId, stream }) : false;

    const response = NextResponse.json({
      ...streamData,
      hasAccess: access,
    }, { headers: rl.headers });

    // Prevent client-side caching for real-time status
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Vary', 'Cookie');

    return response;
  } catch (error) {
    console.error('[streams/status] Error:', error);
    return NextResponse.json({ state: 'idle' as const });
  }
}
