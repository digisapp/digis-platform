import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorGoals, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch active goals for a creator's public profile
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  try {
    const params = await props.params;
    const username = params.username;

    // Find user and goals in one query with timeout
    const goals = await withTimeoutAndRetry(
      async () => {
        // Find user first (case-insensitive)
        const user = await db.query.users.findFirst({
          where: sql`lower(${users.username}) = lower(${username})`,
          columns: { id: true, role: true },
        });

        if (!user || user.role !== 'creator') {
          return [];
        }

        // Fetch active goals
        return db.query.creatorGoals.findMany({
          where: and(
            eq(creatorGoals.creatorId, user.id),
            eq(creatorGoals.isActive, true)
          ),
          orderBy: [desc(creatorGoals.displayOrder), desc(creatorGoals.createdAt)],
        });
      },
      { timeoutMs: 3000, retries: 1, tag: 'profileGoals' }
    );

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('[PROFILE GOALS]', error?.message);
    // Fail soft - return empty goals
    return NextResponse.json({ goals: [] });
  }
}
