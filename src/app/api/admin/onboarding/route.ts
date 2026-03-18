import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorInvites, users } from '@/db/schema';
import { eq, sql, and, or, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

// Generate URL-safe invite code
function generateInviteCode(): string {
  return nanoid(12); // 12 character URL-safe code
}

/**
 * GET /api/admin/onboarding
 * Get invite statistics and list
 */
export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const batchId = searchParams.get('batchId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(creatorInvites.status, status as any));
    }
    if (batchId) {
      conditions.push(eq(creatorInvites.batchId, batchId));
    }
    // Search by Instagram handle, email, or invite code
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(creatorInvites.instagramHandle, searchTerm),
          ilike(creatorInvites.email, searchTerm),
          ilike(creatorInvites.code, searchTerm)
        )
      );
    }

    // Get invites (using simple select to avoid relation issues)
    const invites = await db
      .select()
      .from(creatorInvites)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${creatorInvites.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // Get stats
    const stats = await db
      .select({
        status: creatorInvites.status,
        count: sql<number>`count(*)::int`,
      })
      .from(creatorInvites)
      .groupBy(creatorInvites.status);

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s.count;
      return acc;
    }, {} as Record<string, number>);

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(creatorInvites)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get unique batches for filtering
    const batches = await db
      .selectDistinct({ batchId: creatorInvites.batchId })
      .from(creatorInvites)
      .where(sql`${creatorInvites.batchId} IS NOT NULL`);

    // Get onboarding completion stats for claimed creators
    const onboardingStats = await db
      .select({
        totalClaimed: sql<number>`count(*)::int`,
        completedSetup: sql<number>`count(*) filter (where ${users.onboardingCompletedAt} is not null)::int`,
        stuckAtStep0: sql<number>`count(*) filter (where ${users.onboardingStep} = 0)::int`,
        stuckAtStep1: sql<number>`count(*) filter (where ${users.onboardingStep} = 1)::int`,
        stuckAtStep2: sql<number>`count(*) filter (where ${users.onboardingStep} = 2)::int`,
        stuckAtStep3: sql<number>`count(*) filter (where ${users.onboardingStep} = 3)::int`,
        stuckAtStep4: sql<number>`count(*) filter (where ${users.onboardingStep} = 4)::int`,
        hasAvatar: sql<number>`count(*) filter (where ${users.avatarUrl} is not null)::int`,
        hasBio: sql<number>`count(*) filter (where ${users.bio} is not null and ${users.bio} != '')::int`,
      })
      .from(creatorInvites)
      .innerJoin(users, eq(creatorInvites.claimedBy, users.id))
      .where(eq(creatorInvites.status, 'claimed'));

    return NextResponse.json({
      invites,
      total,
      stats: {
        pending: statsMap.pending || 0,
        claimed: statsMap.claimed || 0,
        expired: statsMap.expired || 0,
        revoked: statsMap.revoked || 0,
        total: Object.values(statsMap).reduce((a, b) => a + b, 0),
      },
      onboardingStats: onboardingStats[0] || {
        totalClaimed: 0,
        completedSetup: 0,
        stuckAtStep0: 0,
        stuckAtStep1: 0,
        stuckAtStep2: 0,
        stuckAtStep3: 0,
        stuckAtStep4: 0,
        hasAvatar: 0,
        hasBio: 0,
      },
      batches: batches.map(b => b.batchId).filter(Boolean),
    });
  } catch (error: any) {
    console.error('[ADMIN ONBOARDING GET] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/admin/onboarding
 * Generate invites from parsed creator data
 */
export const POST = withAdmin(async ({ user, request }) => {
  try {
    const body = await request.json();
    const { creators, expiresInDays, batchName } = body;

    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return NextResponse.json(
        { error: 'No creators provided' },
        { status: 400 }
      );
    }

    // Validate creator data
    const validCreators = creators.filter((c: any) => c.instagramHandle);
    if (validCreators.length === 0) {
      return NextResponse.json(
        { error: 'No valid creators with Instagram handles' },
        { status: 400 }
      );
    }

    // Generate batch ID
    const batchId = batchName || `batch_${Date.now()}`;

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Check for existing invites with same Instagram handles
    // Use parameterized query to prevent SQL injection
    const handlesList = validCreators.map((c: any) => c.instagramHandle.toLowerCase().replace('@', ''));
    const existingHandles = await db
      .select({ instagramHandle: creatorInvites.instagramHandle })
      .from(creatorInvites)
      .where(
        and(
          sql`LOWER(${creatorInvites.instagramHandle}) IN (${sql.join(handlesList.map(h => sql`${h}`), sql`, `)})`,
          eq(creatorInvites.status, 'pending')
        )
      );

    const existingSet = new Set(existingHandles.map(e => e.instagramHandle.toLowerCase()));

    // Filter out creators that already have pending invites
    const newCreators = validCreators.filter(
      (c: any) => !existingSet.has(c.instagramHandle.toLowerCase().replace('@', ''))
    );

    if (newCreators.length === 0) {
      return NextResponse.json(
        { error: 'All creators already have pending invites' },
        { status: 400 }
      );
    }

    // Generate invites
    const invitesToCreate = newCreators.map((creator: any) => ({
      code: generateInviteCode(),
      instagramHandle: creator.instagramHandle.toLowerCase().replace('@', ''),
      email: creator.email || null,
      displayName: creator.displayName || creator.instagramHandle.replace('@', ''),
      status: 'pending' as const,
      expiresAt,
      createdBy: user.id,
      batchId,
    }));

    // Insert invites
    const created = await db
      .insert(creatorInvites)
      .values(invitesToCreate)
      .returning();

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: validCreators.length - newCreators.length,
      batchId,
      invites: created.map(inv => ({
        ...inv,
        inviteUrl: `${process.env.NEXT_PUBLIC_URL || 'https://digis.cc'}/claim/${inv.code}`,
      })),
    });
  } catch (error: any) {
    console.error('[ADMIN ONBOARDING POST] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to generate invites' },
      { status: 500 }
    );
  }
});
