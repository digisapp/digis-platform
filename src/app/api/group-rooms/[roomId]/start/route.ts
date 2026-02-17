import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms/[roomId]/start
 * Start a group room session (creator only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await db.query.groupRooms.findFirst({
      where: eq(groupRooms.id, roomId),
    });

    if (!room || room.creatorId !== user.id) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'active') {
      return NextResponse.json({ room, alreadyStarted: true });
    }

    if (room.status !== 'scheduled' && room.status !== 'waiting') {
      return NextResponse.json({ error: 'Room cannot be started' }, { status: 400 });
    }

    const [updated] = await db
      .update(groupRooms)
      .set({
        status: 'active',
        actualStart: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupRooms.id, roomId))
      .returning();

    return NextResponse.json({ room: updated });
  } catch (error: any) {
    console.error('Error starting room:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start room' },
      { status: 500 }
    );
  }
}
