import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/group-rooms/creator
 * Get creator's own rooms (all statuses)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await db.query.groupRooms.findMany({
      where: eq(groupRooms.creatorId, user.id),
      orderBy: [desc(groupRooms.createdAt)],
      with: {
        participants: {
          with: {
            user: {
              columns: { id: true, displayName: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error('Error fetching creator rooms:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
