import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCreatorByUsername, getCurrentStreamForCreator, hasAccess } from '@/lib/streams';
import { db } from '@/lib/data/system';
import { streams, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ state: 'idle' as const });
    }

    const creator = await getCreatorByUsername(username);
    if (!creator) {
      return NextResponse.json({ state: 'idle' as const });
    }

    const stream = await getCurrentStreamForCreator(creator.id);
    if (!stream) {
      return NextResponse.json({ state: 'idle' as const });
    }

    // Get current user ID if authenticated
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not authenticated, userId stays null
    }

    const access = await hasAccess({ userId, stream });

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

    const response = NextResponse.json({
      state: stream.status === 'live' ? 'live' : stream.status === 'scheduled' ? 'upcoming' : 'ended',
      streamId: stream.id,
      kind: stream.kind,
      priceCents: stream.priceCents ?? 0,
      hasAccess: access,
      startsAt: stream.startsAt ?? null,
      streamTitle: streamDetails?.title ?? 'Live Stream',
      creatorName: creatorDetails?.displayName || creatorDetails?.username || username,
    });

    // Prevent caching for real-time status
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Vary', 'Cookie');

    return response;
  } catch (error) {
    console.error('[streams/status] Error:', error);
    return NextResponse.json({ state: 'idle' as const });
  }
}
