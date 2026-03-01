import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/group-rooms/[roomId]
 * Get room details with participant list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const room = await db.query.groupRooms.findFirst({
      where: eq(groupRooms.id, roomId),
      with: {
        creator: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
        participants: {
          with: {
            user: {
              columns: { id: true, displayName: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (error: any) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/group-rooms/[roomId]
 * Update room settings (creator only)
 */
export async function PATCH(
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

    const body = await request.json();
    const { title, description, maxParticipants, coverImageUrl } = body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (maxParticipants !== undefined) updates.maxParticipants = maxParticipants;
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;

    const [updated] = await db
      .update(groupRooms)
      .set(updates)
      .where(eq(groupRooms.id, roomId))
      .returning();

    return NextResponse.json({ room: updated });
  } catch (error: any) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}
