import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { creatorGoals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PUT - Update a goal
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ goalId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const goalId = params.goalId;

    // Verify the goal exists and belongs to this creator
    const existingGoal = await db.query.creatorGoals.findFirst({
      where: eq(creatorGoals.id, goalId),
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (existingGoal.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { title, description, goalType, targetAmount, rewardText, isActive, showTopTippers } = await request.json();

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (goalType !== undefined) {
      if (!['followers', 'coins', 'subscribers'].includes(goalType)) {
        return NextResponse.json({ error: 'Invalid goal type' }, { status: 400 });
      }
      updates.goalType = goalType;
    }
    if (targetAmount !== undefined) {
      if (targetAmount < 1) {
        return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
      }
      updates.targetAmount = targetAmount;

      // Check if goal is now completed
      if (existingGoal.currentAmount >= targetAmount && !existingGoal.isCompleted) {
        updates.isCompleted = true;
        updates.completedAt = new Date();
      } else if (existingGoal.currentAmount < targetAmount && existingGoal.isCompleted) {
        updates.isCompleted = false;
        updates.completedAt = null;
      }
    }
    if (rewardText !== undefined) updates.rewardText = rewardText;
    if (isActive !== undefined) updates.isActive = isActive;
    if (showTopTippers !== undefined) updates.showTopTippers = showTopTippers;

    // Update the goal
    const [updatedGoal] = await db
      .update(creatorGoals)
      .set(updates)
      .where(eq(creatorGoals.id, goalId))
      .returning();

    return NextResponse.json({ goal: updatedGoal });
  } catch (error: any) {
    console.error('[CREATOR GOAL UPDATE ERROR]', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

/**
 * DELETE - Delete a goal
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ goalId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const goalId = params.goalId;

    // Verify the goal exists and belongs to this creator
    const existingGoal = await db.query.creatorGoals.findFirst({
      where: eq(creatorGoals.id, goalId),
    });

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (existingGoal.creatorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the goal
    await db.delete(creatorGoals).where(eq(creatorGoals.id, goalId));

    return NextResponse.json({ success: true, message: 'Goal deleted successfully' });
  } catch (error: any) {
    console.error('[CREATOR GOAL DELETE ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
  }
}
