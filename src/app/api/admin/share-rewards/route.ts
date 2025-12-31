import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { socialShareSubmissions } from '@/db/schema/rewards';
import { users } from '@/db/schema/users';
import { eq, desc, sql } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/share-rewards - Get all submissions for admin review
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // Get submissions with creator info
    const submissions = await db
      .select({
        id: socialShareSubmissions.id,
        platform: socialShareSubmissions.platform,
        screenshotUrl: socialShareSubmissions.screenshotUrl,
        socialHandle: socialShareSubmissions.socialHandle,
        status: socialShareSubmissions.status,
        coinsAwarded: socialShareSubmissions.coinsAwarded,
        rejectionReason: socialShareSubmissions.rejectionReason,
        createdAt: socialShareSubmissions.createdAt,
        reviewedAt: socialShareSubmissions.reviewedAt,
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          email: users.email,
        },
      })
      .from(socialShareSubmissions)
      .leftJoin(users, eq(socialShareSubmissions.creatorId, users.id))
      .where(status !== 'all' ? eq(socialShareSubmissions.status, status as any) : sql`1=1`)
      .orderBy(desc(socialShareSubmissions.createdAt));

    // Get stats
    const allSubmissions = await db.query.socialShareSubmissions.findMany();
    const stats = {
      pending: allSubmissions.filter(s => s.status === 'pending').length,
      approved: allSubmissions.filter(s => s.status === 'approved').length,
      rejected: allSubmissions.filter(s => s.status === 'rejected').length,
      totalCoinsAwarded: allSubmissions
        .filter(s => s.status === 'approved')
        .reduce((sum, s) => sum + (s.coinsAwarded || 0), 0),
    };

    return NextResponse.json({
      submissions,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching share submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
