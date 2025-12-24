import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { pageViews } from '@/db/schema/admin';
import { users } from '@/db/schema/users';
import { AdminService } from '@/lib/admin/admin-service';
import { createClient } from '@/lib/supabase/server';
import { sql, desc, eq, gte, and, count, countDistinct } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/traffic - Get traffic analytics
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const isAdmin = await AdminService.isAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

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
          sql`${pageViews.createdAt} < ${previousEndDate}`
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
          sql`${pageViews.createdAt} < ${previousEndDate}`
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

    return NextResponse.json({
      summary: {
        totalViews,
        uniqueVisitors,
        viewsGrowth,
        visitorsGrowth,
        previousViews,
        previousUnique,
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
      range,
    });
  } catch (error) {
    console.error('[Admin Traffic] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traffic data' },
      { status: 500 }
    );
  }
}
