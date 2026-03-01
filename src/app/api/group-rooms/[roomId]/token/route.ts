import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms, groupRoomParticipants, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { LiveKitService } from '@/lib/services/livekit-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/group-rooms/[roomId]/token
 * Get LiveKit token for room participant
 */
export async function GET(
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

    if (!room || !room.roomName) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'ended' || room.status === 'cancelled') {
      return NextResponse.json({ error: 'Room is no longer active' }, { status: 400 });
    }

    // Creator can always get a token
    const isCreator = user.id === room.creatorId;

    if (!isCreator) {
      // Check participant is joined
      const participant = await db.query.groupRoomParticipants.findFirst({
        where: and(
          eq(groupRoomParticipants.roomId, roomId),
          eq(groupRoomParticipants.userId, user.id),
          eq(groupRoomParticipants.status, 'joined'),
        ),
      });

      if (!participant) {
        return NextResponse.json({ error: 'You must join the room first' }, { status: 403 });
      }
    }

    // Get user display name
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { displayName: true, username: true },
    });

    const participantName = dbUser?.displayName || dbUser?.username || 'User';

    const token = await LiveKitService.generateToken(
      room.roomName,
      participantName,
      user.id,
    );

    return NextResponse.json({
      token,
      roomName: room.roomName,
      participantName,
      wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error: any) {
    console.error('Error generating room token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
