import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'creators';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const offset = (page - 1) * limit;

    if (tab === 'creators') {
      // Build filter conditions
      let filterCondition = sql``;
      if (filter === 'verified') {
        filterCondition = sql`AND u.is_creator_verified = true`;
      } else if (filter === 'unverified') {
        filterCondition = sql`AND u.is_creator_verified = false`;
      } else if (filter === 'online') {
        filterCondition = sql`AND u.is_online = true`;
      } else if (filter === 'inactive') {
        filterCondition = sql`AND (u.last_seen_at IS NULL OR u.last_seen_at < NOW() - INTERVAL '30 days')`;
      } else if (filter === 'new') {
        filterCondition = sql`AND u.created_at > NOW() - INTERVAL '7 days'`;
      } else if (filter === 'top_earners') {
        // Will be handled in ORDER BY
      }

      // Fetch creators with enhanced metrics
      const creatorsQuery = sql`
        SELECT
          u.id,
          u.email,
          u.username,
          u.display_name,
          u.avatar_url,
          u.bio,
          u.is_creator_verified,
          u.follower_count,
          u.following_count,
          u.last_seen_at,
          u.account_status,
          u.created_at,
          u.is_online,
          u.primary_category,
          COALESCE(w.balance, 0) as balance,
          COALESCE(earnings.total_earned, 0) as total_earned,
          COALESCE(content_stats.content_count, 0) as content_count,
          content_stats.last_post_at,
          COALESCE(stream_stats.total_streams, 0) as total_streams,
          stream_stats.last_stream_at,
          COALESCE(sub_stats.active_subscribers, 0) as active_subscribers,
          COALESCE(traffic_stats.profile_views, 0) as profile_views,
          COALESCE(traffic_stats.views_7d, 0) as views_7d,
          -- Profile completeness: check key fields
          CASE
            WHEN u.avatar_url IS NOT NULL
              AND u.bio IS NOT NULL AND LENGTH(u.bio) > 0
              AND u.display_name IS NOT NULL
              AND u.primary_category IS NOT NULL
            THEN 100
            WHEN u.avatar_url IS NOT NULL AND u.bio IS NOT NULL AND LENGTH(u.bio) > 0
            THEN 75
            WHEN u.avatar_url IS NOT NULL OR (u.bio IS NOT NULL AND LENGTH(u.bio) > 0)
            THEN 50
            ELSE 25
          END as profile_completeness
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(amount) as total_earned
          FROM wallet_transactions
          WHERE amount > 0 AND status = 'completed'
          GROUP BY user_id
        ) earnings ON earnings.user_id = u.id
        LEFT JOIN (
          SELECT
            creator_id,
            COUNT(*) as content_count,
            MAX(created_at) as last_post_at
          FROM content_items
          WHERE is_published = true
          GROUP BY creator_id
        ) content_stats ON content_stats.creator_id = u.id
        LEFT JOIN (
          SELECT
            creator_id,
            COUNT(*) as total_streams,
            MAX(started_at) as last_stream_at
          FROM streams
          GROUP BY creator_id
        ) stream_stats ON stream_stats.creator_id = u.id
        LEFT JOIN (
          SELECT
            creator_id,
            COUNT(*) as active_subscribers
          FROM subscriptions
          WHERE status = 'active'
          GROUP BY creator_id
        ) sub_stats ON sub_stats.creator_id = u.id
        LEFT JOIN (
          SELECT
            creator_username,
            COUNT(*) as profile_views,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as views_7d
          FROM page_views
          WHERE page_type = 'profile' AND creator_username IS NOT NULL
          GROUP BY creator_username
        ) traffic_stats ON traffic_stats.creator_username = u.username
        WHERE u.role = 'creator'
        ${search ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`})` : sql``}
        ${filterCondition}
        ORDER BY
          ${filter === 'top_earners' ? sql`COALESCE(earnings.total_earned, 0) DESC,` : sql``}
          u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const creatorsResult = await db.execute(creatorsQuery);
      const creators = creatorsResult as unknown as Array<Record<string, unknown>>;

      // Get total count with filter
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.role = 'creator'
        ${search ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`})` : sql``}
        ${filterCondition}
      `;
      const countResult = await db.execute(countQuery);
      const countRows = countResult as unknown as Array<{ total: string | number }>;
      const total = Number(countRows[0]?.total || 0);

      return NextResponse.json({
        data: creators,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else if (tab === 'fans') {
      // Build filter conditions for fans
      let filterCondition = sql``;
      if (filter === 'online') {
        filterCondition = sql`AND u.is_online = true`;
      } else if (filter === 'blocked') {
        filterCondition = sql`AND EXISTS (SELECT 1 FROM user_blocks WHERE blocked_id = u.id)`;
      } else if (filter === 'top_spenders') {
        // Will be handled in ORDER BY
      } else if (filter === 'inactive') {
        filterCondition = sql`AND (u.last_seen_at IS NULL OR u.last_seen_at < NOW() - INTERVAL '30 days')`;
      } else if (filter === 'new') {
        filterCondition = sql`AND u.created_at > NOW() - INTERVAL '7 days'`;
      } else if (filter === 'has_balance') {
        filterCondition = sql`AND EXISTS (SELECT 1 FROM wallets WHERE user_id = u.id AND balance > 0)`;
      }

      // Fetch fans with enhanced metrics - using block_count instead of reports
      const fansQuery = sql`
        SELECT
          u.id,
          u.email,
          u.username,
          u.display_name,
          u.avatar_url,
          u.following_count,
          u.last_seen_at,
          u.account_status,
          u.lifetime_spending,
          u.spend_tier,
          u.created_at,
          u.is_online,
          COALESCE(w.balance, 0) as balance,
          COALESCE(spending.total_spent, 0) as total_spent,
          COALESCE(blocks.block_count, 0) as block_count,
          COALESCE(blocks.unique_blockers, 0) as unique_blockers,
          COALESCE(msg_stats.messages_sent, 0) as messages_sent,
          COALESCE(tip_stats.tips_count, 0) as tips_count,
          COALESCE(tip_stats.total_tipped, 0) as total_tipped,
          purchase_stats.last_purchase_at
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(ABS(amount)) as total_spent
          FROM wallet_transactions
          WHERE amount < 0 AND status = 'completed'
          GROUP BY user_id
        ) spending ON spending.user_id = u.id
        LEFT JOIN (
          SELECT
            blocked_id,
            COUNT(*) as block_count,
            COUNT(DISTINCT blocker_id) as unique_blockers
          FROM user_blocks
          GROUP BY blocked_id
        ) blocks ON blocks.blocked_id = u.id
        LEFT JOIN (
          SELECT
            sender_id,
            COUNT(*) as messages_sent
          FROM messages
          GROUP BY sender_id
        ) msg_stats ON msg_stats.sender_id = u.id
        LEFT JOIN (
          SELECT
            user_id,
            COUNT(*) as tips_count,
            SUM(ABS(amount)) as total_tipped
          FROM wallet_transactions
          WHERE type IN ('dm_tip', 'stream_tip', 'gift') AND amount < 0 AND status = 'completed'
          GROUP BY user_id
        ) tip_stats ON tip_stats.user_id = u.id
        LEFT JOIN (
          SELECT
            user_id,
            MAX(created_at) as last_purchase_at
          FROM wallet_transactions
          WHERE type = 'purchase' AND status = 'completed'
          GROUP BY user_id
        ) purchase_stats ON purchase_stats.user_id = u.id
        WHERE u.role = 'fan'
        ${search ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`})` : sql``}
        ${filterCondition}
        ORDER BY
          ${filter === 'top_spenders' ? sql`COALESCE(spending.total_spent, 0) DESC,` : sql``}
          ${filter === 'blocked' ? sql`COALESCE(blocks.block_count, 0) DESC,` : sql``}
          CASE WHEN COALESCE(blocks.block_count, 0) > 0 THEN 0 ELSE 1 END,
          COALESCE(blocks.block_count, 0) DESC,
          u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const fansResult = await db.execute(fansQuery);
      const fans = fansResult as unknown as Array<Record<string, unknown>>;

      // Get total count with filter
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.role = 'fan'
        ${search ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`})` : sql``}
        ${filterCondition}
      `;
      const countResult = await db.execute(countQuery);
      const countRows = countResult as unknown as Array<{ total: string | number }>;
      const total = Number(countRows[0]?.total || 0);

      return NextResponse.json({
        data: fans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
  } catch (error) {
    console.error('Admin community error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community data' },
      { status: 500 }
    );
  }
}
