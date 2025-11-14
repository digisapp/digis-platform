import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorGoals, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // Find the user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'creator') {
      return NextResponse.json({ error: 'User is not a creator' }, { status: 404 });
    }

    // Fetch only active goals
    const goals = await db.query.creatorGoals.findMany({
      where: and(
        eq(creatorGoals.creatorId, user.id),
        eq(creatorGoals.isActive, true)
      ),
      orderBy: [desc(creatorGoals.displayOrder), desc(creatorGoals.createdAt)],
    });

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('[PROFILE GOALS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}
