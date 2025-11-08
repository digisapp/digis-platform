import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/data/system';
import { streamGoals, streams } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get goals for a stream
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const streamId = params.streamId;
    const db = getDb();

    const goals = await db.query.streamGoals.findMany({
      where: eq(streamGoals.streamId, streamId),
      with: {
        gift: true,
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('[GOALS GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

/**
 * Create a new goal for a stream
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamId = params.streamId;
    const db = getDb();

    // Verify user owns this stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { title, goalType, targetAmount, rewardText, giftId } = await request.json();

    // Validate
    if (!title || !goalType || !targetAmount || !rewardText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (targetAmount < 1) {
      return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
    }

    // Create goal
    const [goal] = await db.insert(streamGoals).values({
      streamId,
      title,
      goalType,
      targetAmount,
      rewardText,
      giftId: giftId || null,
      currentAmount: 0,
      isActive: true,
      isCompleted: false,
    }).returning();

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: any) {
    console.error('[GOAL CREATE ERROR]', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}
