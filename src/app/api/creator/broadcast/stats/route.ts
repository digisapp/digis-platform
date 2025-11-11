import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { subscriptions, follows } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get broadcast stats (subscriber and follower counts)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator
    const userProfile = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!userProfile || userProfile.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can access broadcast stats' }, { status: 403 });
    }

    // Get active subscriber count
    const activeSubscribers = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.creatorId, user.id),
          eq(subscriptions.status, 'active'),
          sql`${subscriptions.expiresAt} > NOW()`
        )
      );

    // Get total follower count
    const totalFollowers = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    const stats = {
      activeSubscribers: Number(activeSubscribers[0]?.count || 0),
      totalFollowers: Number(totalFollowers[0]?.count || 0),
      totalSubscribers: Number(activeSubscribers[0]?.count || 0), // Same as active for now
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching broadcast stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcast stats' },
      { status: 500 }
    );
  }
}
