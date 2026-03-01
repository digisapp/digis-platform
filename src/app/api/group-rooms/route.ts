import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms } from '@/db/schema';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms
 * Create a new group room (creator only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title, description, roomType, maxParticipants,
      priceType, priceCoins, scheduledStart, coverImageUrl,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (maxParticipants !== undefined && (maxParticipants < 2 || maxParticipants > 50)) {
      return NextResponse.json({ error: 'maxParticipants must be 2-50' }, { status: 400 });
    }

    if (priceType === 'flat' || priceType === 'per_minute') {
      if (!priceCoins || priceCoins < 1) {
        return NextResponse.json({ error: 'priceCoins required for paid rooms' }, { status: 400 });
      }
    }

    const roomName = `group-${nanoid(16)}`;
    const isInstant = !scheduledStart;

    const [room] = await db
      .insert(groupRooms)
      .values({
        creatorId: user.id,
        title: title.trim(),
        description: description || null,
        roomType: roomType || 'other',
        roomName,
        maxParticipants: maxParticipants || 10,
        priceType: priceType || 'free',
        priceCoins: priceCoins || 0,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
        status: isInstant ? 'waiting' : 'scheduled',
        coverImageUrl: coverImageUrl || null,
      })
      .returning();

    return NextResponse.json({ room });
  } catch (error: any) {
    console.error('Error creating group room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/group-rooms
 * List upcoming/active group rooms
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    let where;
    if (creatorId) {
      where = and(
        eq(groupRooms.creatorId, creatorId),
        or(
          eq(groupRooms.status, 'scheduled'),
          eq(groupRooms.status, 'waiting'),
          eq(groupRooms.status, 'active'),
        ),
      );
    } else {
      where = inArray(groupRooms.status, ['scheduled', 'waiting', 'active']);
    }

    const rooms = await db.query.groupRooms.findMany({
      where,
      orderBy: [desc(groupRooms.createdAt)],
      with: {
        creator: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
      },
      limit: 50,
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error('Error fetching group rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
