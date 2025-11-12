import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';
import { db } from '@/lib/data/system';
import { streams } from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401 }
      );
    }

    // Get stats from last 5 streams
    const recentStreams = await db.query.streams.findMany({
      where: and(
        eq(streams.creatorId, user.id),
        eq(streams.status, 'ended')
      ),
      orderBy: desc(streams.endedAt),
      limit: 5,
    });

    if (recentStreams.length === 0) {
      return NextResponse.json(
        success({ avgViewers: 0, totalStreams: 0 }, requestId),
        { status: 200 }
      );
    }

    // Calculate average viewers
    const totalPeakViewers = recentStreams.reduce(
      (sum, stream) => sum + (stream.peakViewers || 0),
      0
    );
    const avgViewers = Math.round(totalPeakViewers / recentStreams.length);

    // Get total stream count
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(streams)
      .where(eq(streams.creatorId, user.id));

    const totalStreams = Number(result[0]?.count || 0);

    return NextResponse.json(
      success({ avgViewers, totalStreams }, requestId),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[STREAMS/STATS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      failure('Failed to fetch stats', 'unknown', requestId),
      { status: 500 }
    );
  }
}
