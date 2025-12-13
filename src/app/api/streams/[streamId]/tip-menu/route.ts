import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streams } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { publishToChannel } from '@/lib/ably/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/streams/[streamId]/tip-menu
 * Toggle tip menu visibility for a stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    // Verify ownership and update
    const [updatedStream] = await db
      .update(streams)
      .set({
        tipMenuEnabled: enabled,
        updatedAt: new Date()
      })
      .where(and(
        eq(streams.id, streamId),
        eq(streams.creatorId, user.id)
      ))
      .returning({ tipMenuEnabled: streams.tipMenuEnabled });

    if (!updatedStream) {
      return NextResponse.json({ error: 'Stream not found or not authorized' }, { status: 404 });
    }

    // Broadcast to viewers via Ably
    try {
      await publishToChannel(`stream:${streamId}`, 'tip-menu-toggle', { enabled });
    } catch (ablyError) {
      console.error('Error broadcasting tip menu toggle:', ablyError);
    }

    return NextResponse.json({
      success: true,
      tipMenuEnabled: updatedStream.tipMenuEnabled
    });
  } catch (error: any) {
    console.error('Error toggling tip menu:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle tip menu' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/streams/[streamId]/tip-menu
 * Get tip menu status for a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: {
        tipMenuEnabled: true,
        creatorId: true,
      },
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    return NextResponse.json({
      tipMenuEnabled: stream.tipMenuEnabled,
      creatorId: stream.creatorId
    });
  } catch (error: any) {
    console.error('Error getting tip menu status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get tip menu status' },
      { status: 500 }
    );
  }
}
