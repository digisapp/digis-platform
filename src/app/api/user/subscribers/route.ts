import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { subscriptions, subscriptionTiers, users } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active subscribers for this creator
    const activeSubscribers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
        isCreatorVerified: users.isCreatorVerified,
        followerCount: users.followerCount,
        subscriptionStatus: subscriptions.status,
        subscriptionTier: subscriptionTiers.tier,
        subscriptionTierName: subscriptionTiers.name,
        subscriptionStartedAt: subscriptions.createdAt,
        subscriptionExpiresAt: subscriptions.expiresAt,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .innerJoin(subscriptionTiers, eq(subscriptions.tierId, subscriptionTiers.id))
      .where(
        and(
          eq(subscriptions.creatorId, user.id),
          eq(subscriptions.status, 'active'),
          sql`${subscriptions.expiresAt} > NOW()`
        )
      )
      .orderBy(sql`${subscriptions.createdAt} DESC`);

    return NextResponse.json({
      subscribers: activeSubscribers,
      count: activeSubscribers.length
    });
  } catch (error: any) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}
