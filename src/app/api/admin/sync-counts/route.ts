import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sync-counts
 * Syncs follower_count and following_count for all users
 * Also marks users as offline if not seen in 10 minutes
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true, isAdmin: true },
    });

    if (!dbUser || (dbUser.role !== 'admin' && !dbUser.isAdmin)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sync follower counts from actual follows table
    const followerSync = await db.execute(sql`
      UPDATE users u
      SET follower_count = COALESCE((
        SELECT COUNT(*)::int
        FROM follows f
        WHERE f.following_id = u.id
      ), 0)
    `);

    // Sync following counts from actual follows table
    const followingSync = await db.execute(sql`
      UPDATE users u
      SET following_count = COALESCE((
        SELECT COUNT(*)::int
        FROM follows f
        WHERE f.follower_id = u.id
      ), 0)
    `);

    // Mark users as offline if not seen in 10 minutes
    const offlineSync = await db.execute(sql`
      UPDATE users
      SET is_online = false
      WHERE is_online = true
      AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '10 minutes')
    `);

    // Sync lifetime spending from wallet transactions
    const spendingSync = await db.execute(sql`
      UPDATE users u
      SET lifetime_spending = COALESCE((
        SELECT SUM(ABS(amount))::int
        FROM wallet_transactions wt
        WHERE wt.user_id = u.id
        AND wt.amount < 0
        AND wt.status = 'completed'
      ), 0)
    `);

    // Update spend tiers based on lifetime spending
    const tierSync = await db.execute(sql`
      UPDATE users
      SET spend_tier = CASE
        WHEN lifetime_spending >= 100000 THEN 'diamond'
        WHEN lifetime_spending >= 50000 THEN 'platinum'
        WHEN lifetime_spending >= 10000 THEN 'gold'
        WHEN lifetime_spending >= 5000 THEN 'silver'
        WHEN lifetime_spending >= 1000 THEN 'bronze'
        ELSE 'none'
      END
    `);

    return NextResponse.json({
      success: true,
      message: 'Counts synced successfully',
      synced: {
        followerCounts: true,
        followingCounts: true,
        offlineStatus: true,
        lifetimeSpending: true,
        spendTiers: true,
      },
    });
  } catch (error) {
    console.error('Sync counts error:', error);
    return NextResponse.json(
      { error: 'Failed to sync counts' },
      { status: 500 }
    );
  }
}
