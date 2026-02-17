import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms, groupRoomParticipants } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms/[roomId]/remove
 * Remove a participant from the room (creator only)
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
      return NextResponse.json({ error: 'Room not found or not authorized' }, { status: 404 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const now = new Date();
    const [updated] = await db
      .update(groupRoomParticipants)
      .set({
        status: 'removed',
        leftAt: now,
      })
      .where(and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.userId, userId),
        eq(groupRoomParticipants.status, 'joined'),
      ))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Participant not found in room' }, { status: 404 });
    }

    // Decrement current participants
    await db
      .update(groupRooms)
      .set({
        currentParticipants: sql`GREATEST(${groupRooms.currentParticipants} - 1, 0)`,
        updatedAt: now,
      })
      .where(eq(groupRooms.id, roomId));

    return NextResponse.json({ removed: true, participant: updated });
  } catch (error: any) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove participant' },
      { status: 500 }
    );
  }
}
