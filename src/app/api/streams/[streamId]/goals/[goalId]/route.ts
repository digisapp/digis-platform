import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { streamGoals, streams } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Update a goal (PATCH)
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ streamId: string; goalId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { streamId, goalId } = params;

    // Verify user owns this stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get existing goal
    const existingGoal = await db.query.streamGoals.findFirst({
      where: and(
        eq(streamGoals.id, goalId),
        eq(streamGoals.streamId, streamId)
      ),
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const { title, targetAmount, rewardText } = await request.json();

    // Validate
    if (!title || !targetAmount || !rewardText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (targetAmount < 1) {
      return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
    }

    // Don't allow updating target if current amount exceeds new target
    if (existingGoal.currentAmount > targetAmount) {
      return NextResponse.json({
        error: `Target amount cannot be less than current progress (${existingGoal.currentAmount})`
      }, { status: 400 });
    }

    // Update goal
    const [updatedGoal] = await db
      .update(streamGoals)
      .set({
        title,
        targetAmount,
        rewardText,
        updatedAt: new Date(),
      })
      .where(eq(streamGoals.id, goalId))
      .returning();

    return NextResponse.json({ goal: updatedGoal });
  } catch (error: any) {
    console.error('[GOAL UPDATE ERROR]', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

/**
 * Delete/End a goal (DELETE)
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ streamId: string; goalId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const { streamId, goalId } = params;

    // Verify user owns this stream
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream || stream.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify goal exists and belongs to this stream
    const goal = await db.query.streamGoals.findFirst({
      where: and(
        eq(streamGoals.id, goalId),
        eq(streamGoals.streamId, streamId)
      ),
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Set goal as inactive (soft delete)
    const [deletedGoal] = await db
      .update(streamGoals)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(streamGoals.id, goalId))
      .returning();

    // Broadcast goal deletion to all viewers via Ably
    try {
      await AblyRealtimeService.broadcastGoalUpdate(streamId, deletedGoal, 'deleted');
    } catch (broadcastError) {
      console.error('[GOAL DELETE BROADCAST ERROR]', broadcastError);
      // Don't fail the request if broadcast fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[GOAL DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to end goal' }, { status: 500 });
  }
}
