import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';
import { isAdminUser } from '@/lib/admin/check-admin';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/analytics - Get platform analytics
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (email first, then DB)
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate date ranges
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Run ALL queries in parallel for maximum speed
    const [
      recentUsersResult,
      allUsersRolesResult,
      applicationsResult,
      stats,
      lastWeekResult,
      previousWeekResult,
    ] = await withTimeoutAndRetry(
      () => Promise.all([
        // 1. Get user signups over last 30 days (for timeline chart)
        adminClient
          .from('users')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true }),

        // 2. Get ALL users roles (for distribution pie chart)
        adminClient
          .from('users')
          .select('role'),

        // 3. Get all applications with their status
        adminClient
          .from('creator_applications')
          .select('status, created_at, content_type'),

        // 4. Get total stats
        AdminService.getStatistics(),

        // 5. Get last week signups count
        adminClient
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo.toISOString()),

        // 6. Get previous week signups count
        adminClient
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', fourteenDaysAgo.toISOString())
          .lt('created_at', sevenDaysAgo.toISOString()),
      ]),
      { timeoutMs: 8000, retries: 2, tag: 'adminAnalytics' }
    );

    const recentUsers = recentUsersResult.data;
    const allUsersRoles = allUsersRolesResult.data;
    const applications = applicationsResult.data;
    const lastWeekSignups = lastWeekResult.count || 0;
    const previousWeekSignups = previousWeekResult.count || 0;

    // Process user signups by day (last 30 days only)
    const signupsByDay: { [key: string]: number } = {};
    recentUsers?.forEach((user: any) => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      signupsByDay[date] = (signupsByDay[date] || 0) + 1;
    });

    // Process ALL users for role distribution
    const roleDistribution = { fan: 0, creator: 0, admin: 0 };
    allUsersRoles?.forEach((user: any) => {
      if (user.role && roleDistribution.hasOwnProperty(user.role)) {
        roleDistribution[user.role as keyof typeof roleDistribution]++;
      }
    });

    // Fill in missing days with 0
    const signupsTimeline = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      signupsTimeline.push({
        date: dateStr,
        signups: signupsByDay[dateStr] || 0,
      });
    }

    // Process application statistics
    const applicationStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    const contentTypeStats: { [key: string]: number } = {};

    applications?.forEach((app: any) => {
      applicationStats[app.status as keyof typeof applicationStats]++;
      if (app.content_type) {
        contentTypeStats[app.content_type] = (contentTypeStats[app.content_type] || 0) + 1;
      }
    });

    // Calculate growth rate
    const growthRate = previousWeekSignups && previousWeekSignups > 0
      ? ((lastWeekSignups || 0) - previousWeekSignups) / previousWeekSignups * 100
      : 0;

    // Format content type stats for charts
    const contentTypes = Object.entries(contentTypeStats).map(([type, count]) => ({
      type,
      count,
    }));

    return NextResponse.json({
      signupsTimeline,
      roleDistribution,
      applicationStats,
      contentTypes,
      totalStats: stats,
      growthRate: Math.round(growthRate * 10) / 10,
      lastWeekSignups: lastWeekSignups || 0,
    });
  } catch (error: any) {
    console.error('[ADMIN/ANALYTICS]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Analytics temporarily unavailable' : 'Failed to fetch analytics' },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}
