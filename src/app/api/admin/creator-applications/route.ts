import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorApplications, profiles } from '@/db/schema';
import { eq, desc, sql, and, ilike, or } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/creator-applications
 * List all creator applications with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending'; // pending, approved, rejected, all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build query
    const query = sql`
      SELECT
        ca.id,
        ca.user_id,
        ca.instagram_handle,
        ca.tiktok_handle,
        ca.other_social_links,
        ca.follower_count,
        ca.content_category,
        ca.bio,
        ca.status,
        ca.rejection_reason,
        ca.admin_notes,
        ca.created_at,
        ca.reviewed_at,
        u.email,
        u.username,
        u.display_name,
        u.avatar_url,
        u.created_at as user_created_at,
        reviewer.username as reviewer_username,
        p.phone_number
      FROM creator_applications ca
      INNER JOIN users u ON u.id = ca.user_id
      LEFT JOIN users reviewer ON reviewer.id = ca.reviewed_by
      LEFT JOIN profiles p ON p.user_id = ca.user_id
      WHERE 1=1
      ${status !== 'all' ? sql`AND ca.status = ${status}` : sql``}
      ${search ? sql`AND (
        u.username ILIKE ${`%${search}%`}
        OR u.email ILIKE ${`%${search}%`}
        OR u.display_name ILIKE ${`%${search}%`}
        OR ca.instagram_handle ILIKE ${`%${search}%`}
        OR ca.tiktok_handle ILIKE ${`%${search}%`}
        OR p.phone_number ILIKE ${`%${search}%`}
      )` : sql``}
      ORDER BY ca.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const applications = await db.execute(query);

    // Get total count
    const countQuery = sql`
      SELECT COUNT(*) as total
      FROM creator_applications ca
      INNER JOIN users u ON u.id = ca.user_id
      LEFT JOIN profiles p ON p.user_id = ca.user_id
      WHERE 1=1
      ${status !== 'all' ? sql`AND ca.status = ${status}` : sql``}
      ${search ? sql`AND (
        u.username ILIKE ${`%${search}%`}
        OR u.email ILIKE ${`%${search}%`}
        OR u.display_name ILIKE ${`%${search}%`}
        OR ca.instagram_handle ILIKE ${`%${search}%`}
        OR ca.tiktok_handle ILIKE ${`%${search}%`}
        OR p.phone_number ILIKE ${`%${search}%`}
      )` : sql``}
    `;

    const countResult = await db.execute(countQuery);
    const total = Number((countResult as any)[0]?.total || 0);

    // Get counts by status for tabs
    const statusCountsQuery = sql`
      SELECT
        status,
        COUNT(*) as count
      FROM creator_applications
      GROUP BY status
    `;
    const statusCounts = await db.execute(statusCountsQuery);
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      all: 0,
    };
    for (const row of statusCounts as any[]) {
      counts[row.status as keyof typeof counts] = Number(row.count);
      counts.all += Number(row.count);
    }

    return NextResponse.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    });
  } catch (error: any) {
    console.error('Error fetching creator applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
