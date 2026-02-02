import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorApplications, profiles } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApplicationRow {
  id: string;
  user_id: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  other_social_links: string | null;
  follower_count: number | null;
  content_category: string | null;
  bio: string | null;
  status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  email: string | null;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  user_created_at: string;
  reviewer_username: string | null;
  phone_number: string | null;
}

interface UserMatch {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
}

/**
 * GET /api/admin/creator-applications
 * List all creator applications with filtering
 */
export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
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

    const applications = await db.execute(query) as unknown as ApplicationRow[];

    // Check for red flags - duplicate detection
    const applicationsWithFlags = await Promise.all(
      applications.map(async (app) => {
        const redFlags: { type: string; message: string; severity: 'warning' | 'danger' }[] = [];

        // Check if display_name matches an existing creator's username or display_name
        if (app.display_name) {
          const displayNameMatches = await db.execute(sql`
            SELECT id, username, display_name, role
            FROM users
            WHERE id != ${app.user_id}
              AND role = 'creator'
              AND (
                LOWER(username) = LOWER(${app.display_name})
                OR LOWER(display_name) = LOWER(${app.display_name})
              )
            LIMIT 5
          `) as unknown as UserMatch[];

          if (displayNameMatches.length > 0) {
            const matches = displayNameMatches.map(m => `@${m.username}`).join(', ');
            redFlags.push({
              type: 'display_name_match',
              message: `Display name matches existing creator(s): ${matches}`,
              severity: 'danger',
            });
          }
        }

        // Check if instagram_handle matches an existing user's username
        if (app.instagram_handle) {
          const cleanHandle = app.instagram_handle.replace(/^@/, '').replace(/_$/, '');
          const igMatches = await db.execute(sql`
            SELECT id, username, display_name, role
            FROM users
            WHERE id != ${app.user_id}
              AND (
                LOWER(username) = LOWER(${cleanHandle})
                OR LOWER(username) = LOWER(${app.instagram_handle})
              )
            LIMIT 5
          `) as unknown as UserMatch[];

          if (igMatches.length > 0) {
            const matches = igMatches.map((m) => `@${m.username} (${m.role})`).join(', ');
            redFlags.push({
              type: 'instagram_username_match',
              message: `Instagram handle matches existing user(s): ${matches}`,
              severity: 'warning',
            });
          }
        }

        // Check account age - flag accounts less than 24 hours old
        const accountAgeMs = Date.now() - new Date(app.user_created_at).getTime();
        const accountAgeHours = accountAgeMs / (1000 * 60 * 60);
        const accountAgeDays = Math.floor(accountAgeHours / 24);

        if (accountAgeHours < 24) {
          redFlags.push({
            type: 'new_account',
            message: `Account created ${Math.round(accountAgeHours)} hours ago`,
            severity: 'warning',
          });
        }

        return {
          ...app,
          red_flags: redFlags,
          account_age_days: accountAgeDays,
        };
      })
    );

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

    const countResult = await db.execute(countQuery) as { total: string }[];
    const total = Number(countResult[0]?.total || 0);

    // Get counts by status for tabs
    const statusCountsQuery = sql`
      SELECT
        status,
        COUNT(*) as count
      FROM creator_applications
      GROUP BY status
    `;
    const statusCounts = await db.execute(statusCountsQuery) as { status: string; count: string }[];
    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      all: 0,
    };
    for (const row of statusCounts) {
      counts[row.status as keyof typeof counts] = Number(row.count);
      counts.all += Number(row.count);
    }

    return NextResponse.json({
      applications: applicationsWithFlags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    });
  } catch (error: unknown) {
    console.error('Error fetching creator applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
});
