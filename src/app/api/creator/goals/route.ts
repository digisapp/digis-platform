import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { creatorGoals, users, subscriptions, wallets } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch all goals for the authenticated creator
 */
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role to verify they're a creator
    const dbUser = await withTimeoutAndRetry(
      () => db.query.users.findFirst({
        where: eq(users.id, user.id),
      }),
      { timeoutMs: 5000, retries: 1, tag: 'goalsUser' }
    );

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can access goals' }, { status: 403 });
    }

    // Fetch all goals for this creator
    const goals = await withTimeoutAndRetry(
      () => db.query.creatorGoals.findMany({
        where: eq(creatorGoals.creatorId, user.id),
        orderBy: [desc(creatorGoals.displayOrder), desc(creatorGoals.createdAt)],
      }),
      { timeoutMs: 5000, retries: 1, tag: 'goalsQuery' }
    );

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('[CREATOR GOALS GET]', { requestId, error: error?.message });
    const isTimeout = error?.message?.includes('timeout');
    return NextResponse.json(
      { error: isTimeout ? 'Service temporarily unavailable' : 'Failed to fetch goals', goals: [] },
      { status: isTimeout ? 503 : 500, headers: { 'x-request-id': requestId } }
    );
  }
}

/**
 * POST - Create a new goal
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role to verify they're a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can create goals' }, { status: 403 });
    }

    const { title, description, goalType, targetAmount, rewardText, showTopTippers } = await request.json();

    // Validate required fields
    if (!title || !goalType || !targetAmount || !rewardText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate goal type
    if (!['followers', 'coins', 'subscribers'].includes(goalType)) {
      return NextResponse.json({ error: 'Invalid goal type' }, { status: 400 });
    }

    // Validate target amount
    if (targetAmount < 1) {
      return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
    }

    // Delete any existing active goals (only allow one active goal at a time)
    // Use single batch delete instead of fetching then looping
    await db.delete(creatorGoals).where(
      and(
        eq(creatorGoals.creatorId, user.id),
        eq(creatorGoals.isActive, true)
      )
    );

    // Get current amount based on goal type
    let currentAmount = 0;
    if (goalType === 'followers') {
      currentAmount = dbUser.followerCount || 0;
    } else if (goalType === 'subscribers') {
      // Count active subscriptions
      const userSubscriptions = await db.query.subscriptions.findMany({
        where: eq(subscriptions.creatorId, user.id),
      });
      currentAmount = userSubscriptions.length;
    } else if (goalType === 'coins') {
      // Get wallet balance
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, user.id),
      });
      currentAmount = wallet?.balance || 0;
    }

    // Create the new goal
    const [goal] = await db.insert(creatorGoals).values({
      creatorId: user.id,
      title,
      description: description || null,
      goalType,
      targetAmount,
      currentAmount,
      rewardText,
      showTopTippers: showTopTippers !== false,
      isActive: true,
      isCompleted: currentAmount >= targetAmount,
      completedAt: currentAmount >= targetAmount ? new Date() : null,
      displayOrder: 0,
    }).returning();

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: any) {
    console.error('[CREATOR GOAL CREATE ERROR]', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
