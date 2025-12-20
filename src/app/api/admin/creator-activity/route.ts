import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, userActivityLogs } from '@/lib/data/system';
import { eq, sql, desc, and, gte, count } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

// GET /api/admin/creator-activity - Get creator login/activity stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get time ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all creators with their activity counts
    const creatorsWithActivity = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isCreatorVerified: users.isCreatorVerified,
        lastSeenAt: users.lastSeenAt,
        followerCount: users.followerCount,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'creator'))
      .orderBy(desc(users.lastSeenAt));

    // Get login counts per creator from activity logs (if table exists and has data)
    let loginCountsToday: Record<string, number> = {};
    let loginCountsWeek: Record<string, number> = {};
    let loginCountsMonth: Record<string, number> = {};

    try {
      // Today's logins per creator
      const todayLogins = await db
        .select({
          userId: userActivityLogs.userId,
          count: count(),
        })
        .from(userActivityLogs)
        .where(and(
          eq(userActivityLogs.activityType, 'login'),
          gte(userActivityLogs.createdAt, today)
        ))
        .groupBy(userActivityLogs.userId);

      todayLogins.forEach(row => {
        loginCountsToday[row.userId] = row.count;
      });

      // This week's logins per creator
      const weekLogins = await db
        .select({
          userId: userActivityLogs.userId,
          count: count(),
        })
        .from(userActivityLogs)
        .where(and(
          eq(userActivityLogs.activityType, 'login'),
          gte(userActivityLogs.createdAt, thisWeek)
        ))
        .groupBy(userActivityLogs.userId);

      weekLogins.forEach(row => {
        loginCountsWeek[row.userId] = row.count;
      });

      // This month's logins per creator
      const monthLogins = await db
        .select({
          userId: userActivityLogs.userId,
          count: count(),
        })
        .from(userActivityLogs)
        .where(and(
          eq(userActivityLogs.activityType, 'login'),
          gte(userActivityLogs.createdAt, thisMonth)
        ))
        .groupBy(userActivityLogs.userId);

      monthLogins.forEach(row => {
        loginCountsMonth[row.userId] = row.count;
      });
    } catch (e) {
      // Table might not exist yet, that's ok - we'll use lastSeenAt
      console.log('Activity logs table not ready yet, using lastSeenAt');
    }

    // Calculate activity status for each creator
    const creatorsWithActivityData = creatorsWithActivity.map(creator => {
      const lastSeen = creator.lastSeenAt ? new Date(creator.lastSeenAt) : null;
      let activityStatus: 'active_today' | 'active_week' | 'active_month' | 'inactive' = 'inactive';

      if (lastSeen) {
        if (lastSeen >= today) {
          activityStatus = 'active_today';
        } else if (lastSeen >= thisWeek) {
          activityStatus = 'active_week';
        } else if (lastSeen >= thisMonth) {
          activityStatus = 'active_month';
        }
      }

      return {
        ...creator,
        activityStatus,
        loginsToday: loginCountsToday[creator.id] || 0,
        loginsThisWeek: loginCountsWeek[creator.id] || 0,
        loginsThisMonth: loginCountsMonth[creator.id] || 0,
        daysSinceLastSeen: lastSeen
          ? Math.floor((now.getTime() - lastSeen.getTime()) / (24 * 60 * 60 * 1000))
          : null,
      };
    });

    // Calculate summary stats
    const activeToday = creatorsWithActivityData.filter(c => c.activityStatus === 'active_today').length;
    const activeThisWeek = creatorsWithActivityData.filter(c =>
      c.activityStatus === 'active_today' || c.activityStatus === 'active_week'
    ).length;
    const activeThisMonth = creatorsWithActivityData.filter(c =>
      c.activityStatus !== 'inactive'
    ).length;
    const inactive = creatorsWithActivityData.filter(c => c.activityStatus === 'inactive').length;

    return NextResponse.json({
      summary: {
        totalCreators: creatorsWithActivityData.length,
        activeToday,
        activeThisWeek,
        activeThisMonth,
        inactive,
      },
      creators: creatorsWithActivityData,
    });
  } catch (error: any) {
    console.error('Error fetching creator activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator activity' },
      { status: 500 }
    );
  }
}
