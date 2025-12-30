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
    const offset = (page - 1) * limit;

    if (tab === 'creators') {
      // Fetch creators with their wallet balance and earnings
      const creatorsQuery = sql`
        SELECT
          u.id,
          u.email,
          u.username,
          u.display_name,
          u.avatar_url,
          u.is_creator_verified,
          u.follower_count,
          u.following_count,
          u.last_seen_at,
          u.account_status,
          u.created_at,
          u.is_online,
          COALESCE(w.balance, 0) as balance,
          COALESCE(earnings.total_earned, 0) as total_earned,
          COALESCE(content_count.count, 0) as content_count
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(amount) as total_earned
          FROM wallet_transactions
          WHERE amount > 0 AND status = 'completed'
          GROUP BY user_id
        ) earnings ON earnings.user_id = u.id
        LEFT JOIN (
          SELECT creator_id, COUNT(*) as count
          FROM content_items
          WHERE is_published = true
          GROUP BY creator_id
        ) content_count ON content_count.creator_id = u.id
        WHERE u.role = 'creator'
        ${search ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`})` : sql``}
        ORDER BY u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const creatorsResult = await db.execute(creatorsQuery);
      const creators = creatorsResult as unknown as Array<Record<string, unknown>>;

      // Get total count
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM users
        WHERE role = 'creator'
        ${search ? sql`AND (username ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR display_name ILIKE ${`%${search}%`})` : sql``}
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
      // Fetch fans with their balance, spending, following count, and report count
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
          COALESCE(reports.report_count, 0) as report_count,
          COALESCE(reports.unique_reporters, 0) as unique_reporters
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
            reported_user_id,
            COUNT(*) as report_count,
            COUNT(DISTINCT reporter_id) as unique_reporters
          FROM user_reports
          GROUP BY reported_user_id
        ) reports ON reports.reported_user_id = u.id
        WHERE u.role = 'fan'
        ${search ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.email ILIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`})` : sql``}
        ORDER BY
          CASE WHEN COALESCE(reports.report_count, 0) > 0 THEN 0 ELSE 1 END,
          COALESCE(reports.report_count, 0) DESC,
          u.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const fansResult = await db.execute(fansQuery);
      const fans = fansResult as unknown as Array<Record<string, unknown>>;

      // Get total count
      const countQuery = sql`
        SELECT COUNT(*) as total
        FROM users
        WHERE role = 'fan'
        ${search ? sql`AND (username ILIKE ${`%${search}%`} OR email ILIKE ${`%${search}%`} OR display_name ILIKE ${`%${search}%`})` : sql``}
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
