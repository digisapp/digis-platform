import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin/check-admin';
import { db } from '@/lib/data/system';
import { creatorInvites } from '@/db/schema';
import { eq, sql, and, isNull, gt, or, ilike } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

// Generate URL-safe invite code
function generateInviteCode(): string {
  return nanoid(12); // 12 character URL-safe code
}

/**
 * GET /api/admin/onboarding
 * Get invite statistics and list
 */
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
      batches: batches.map(b => b.batchId).filter(Boolean),
    });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/onboarding
 * Generate invites from parsed creator data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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
    const handlesList = validCreators.map((c: any) => c.instagramHandle.toLowerCase().replace('@', ''));
    const existingHandles = await db
      .select({ instagramHandle: creatorInvites.instagramHandle })
      .from(creatorInvites)
      .where(
        and(
          sql`LOWER(${creatorInvites.instagramHandle}) = ANY(ARRAY[${sql.raw(handlesList.map((h: string) => `'${h.replace(/'/g, "''")}'`).join(','))}]::text[])`,
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
    console.error('Error generating invites:', error);
    return NextResponse.json(
      { error: 'Failed to generate invites' },
      { status: 500 }
    );
  }
}
