import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { pageViews } from '@/db/schema/admin';
import { users } from '@/db/schema/users';
import { sql, desc, eq, gte, lt, and, count, countDistinct } from 'drizzle-orm';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/traffic - Get traffic analytics
export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case '7d':
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
    }

    // Create admin client for signups data
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate signups date ranges
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Fetch all data in parallel
    const [
      totalViewsResult,
      previousViewsResult,
      uniqueVisitorsResult,
      previousUniqueResult,
      viewsByPageType,
      viewsByDevice,
      topPages,
      topCreatorProfiles,
      viewsTimeline,
      signupsResult,
      lastWeekSignupsResult,
      previousWeekSignupsResult,
    ] = await Promise.all([
      // Total views in period
      db.select({ count: count() })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate)),

      // Previous period views (for comparison)
      db.select({ count: count() })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, previousStartDate),
          lt(pageViews.createdAt, previousEndDate)
        )),

      // Unique visitors in period
      db.select({ count: countDistinct(pageViews.visitorId) })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate)),

      // Previous period unique visitors
      db.select({ count: countDistinct(pageViews.visitorId) })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, previousStartDate),
          lt(pageViews.createdAt, previousEndDate)
        )),

      // Views by page type
      db.select({
        pageType: pageViews.pageType,
        count: count(),
      })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate))
        .groupBy(pageViews.pageType)
        .orderBy(desc(count())),

      // Views by device
      db.select({
        device: pageViews.device,
        count: count(),
      })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate))
        .groupBy(pageViews.device)
        .orderBy(desc(count())),

      // Top pages (limit 10)
      db.select({
        path: pageViews.path,
        count: count(),
      })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate))
        .groupBy(pageViews.path)
        .orderBy(desc(count()))
        .limit(10),

      // Top creator profiles (limit 10)
      db.select({
        creatorUsername: pageViews.creatorUsername,
        count: count(),
      })
        .from(pageViews)
        .where(and(
          gte(pageViews.createdAt, startDate),
          eq(pageViews.pageType, 'profile'),
          sql`${pageViews.creatorUsername} IS NOT NULL`
        ))
        .groupBy(pageViews.creatorUsername)
        .orderBy(desc(count()))
        .limit(10),

      // Views timeline (daily)
      db.select({
        date: sql<string>`DATE(${pageViews.createdAt})`.as('date'),
        count: count(),
      })
        .from(pageViews)
        .where(gte(pageViews.createdAt, startDate))
        .groupBy(sql`DATE(${pageViews.createdAt})`)
        .orderBy(sql`DATE(${pageViews.createdAt})`),

      // User signups in period (for combined timeline)
      adminClient
        .from('users')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }),

      // Last week signups count
      adminClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),

      // Previous week signups count
      adminClient
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString()),
    ]);

    // Calculate growth rates
    const totalViews = totalViewsResult[0]?.count || 0;
    const previousViews = previousViewsResult[0]?.count || 0;
    const viewsGrowth = previousViews > 0
      ? Math.round(((totalViews - previousViews) / previousViews) * 100)
      : 0;

    const uniqueVisitors = uniqueVisitorsResult[0]?.count || 0;
    const previousUnique = previousUniqueResult[0]?.count || 0;
    const visitorsGrowth = previousUnique > 0
      ? Math.round(((uniqueVisitors - previousUnique) / previousUnique) * 100)
      : 0;

    // Process signups data
    const signups = signupsResult.data || [];
    const lastWeekSignups = lastWeekSignupsResult.count || 0;
    const previousWeekSignups = previousWeekSignupsResult.count || 0;

    // Calculate signups growth rate
    const signupsGrowth = previousWeekSignups > 0
      ? Math.round(((lastWeekSignups - previousWeekSignups) / previousWeekSignups) * 100)
      : 0;

    // Process signups by day
    const signupsByDay: { [key: string]: number } = {};
    signups.forEach((user: Record<string, unknown>) => {
      const date = new Date(user.created_at as string).toISOString().split('T')[0];
      signupsByDay[date] = (signupsByDay[date] || 0) + 1;
    });

    // Create combined timeline with both views and signups
    const combinedTimeline = viewsTimeline.map(r => ({
      date: r.date,
      views: r.count,
      signups: signupsByDay[r.date] || 0,
    }));

    return NextResponse.json({
      summary: {
        totalViews,
        uniqueVisitors,
        viewsGrowth,
        visitorsGrowth,
        previousViews,
        previousUnique,
        lastWeekSignups,
        signupsGrowth,
      },
      viewsByPageType: viewsByPageType.map(r => ({
        pageType: r.pageType,
        views: r.count,
      })),
      viewsByDevice: viewsByDevice.map(r => ({
        device: r.device || 'unknown',
        views: r.count,
      })),
      topPages: topPages.map(r => ({
        path: r.path,
        views: r.count,
      })),
      topCreatorProfiles: topCreatorProfiles.map(r => ({
        username: r.creatorUsername,
        views: r.count,
      })),
      viewsTimeline: viewsTimeline.map(r => ({
        date: r.date,
        views: r.count,
      })),
      combinedTimeline,
      range,
    });
  } catch (error) {
    console.error('[Admin Traffic] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic data' },
      { status: 500 }
    );
  }
});
