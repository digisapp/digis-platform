import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, streamPolls, streamPollVotes } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Vote on a poll
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; pollId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pollId } = await params;
    const body = await request.json();
    const { optionIndex } = body;

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid option index' },
        { status: 400 }
      );
    }

    // Get the poll
    const poll = await db.query.streamPolls.findFirst({
      where: eq(streamPolls.id, pollId),
    });

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    // Check if poll is still active
    if (!poll.isActive) {
      return NextResponse.json({ error: 'Poll has ended' }, { status: 400 });
    }

    // Check if poll has expired
    if (new Date(poll.endsAt) < new Date()) {
      await db.update(streamPolls)
        .set({ isActive: false })
        .where(eq(streamPolls.id, pollId));
      return NextResponse.json({ error: 'Poll has expired' }, { status: 400 });
    }

    // Check if option index is valid
    if (optionIndex >= poll.options.length) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
    }

    // Check if user already voted
    const existingVote = await db.query.streamPollVotes.findFirst({
      where: and(
        eq(streamPollVotes.pollId, pollId),
        eq(streamPollVotes.userId, user.id)
      ),
    });

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted' }, { status: 400 });
    }

    // Record the vote
    await db.insert(streamPollVotes).values({
      pollId,
      userId: user.id,
      optionIndex,
    });

    // Update vote counts - increment the specific option
    const newVoteCounts = [...(poll.voteCounts || poll.options.map(() => 0))];
    newVoteCounts[optionIndex] = (newVoteCounts[optionIndex] || 0) + 1;

    const [updatedPoll] = await db.update(streamPolls)
      .set({
        voteCounts: newVoteCounts,
        totalVotes: poll.totalVotes + 1,
      })
      .where(eq(streamPolls.id, pollId))
      .returning();

    return NextResponse.json({
      success: true,
      poll: updatedPoll,
      votedOption: optionIndex,
    });
  } catch (error: any) {
    console.error('Error voting on poll:', error);
    return NextResponse.json(
      { error: 'Failed to vote' },
      { status: 500 }
    );
  }
}

// GET - Check if user has voted and get their vote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; pollId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ hasVoted: false, votedOption: null });
    }

    const { pollId } = await params;

    const vote = await db.query.streamPollVotes.findFirst({
      where: and(
        eq(streamPollVotes.pollId, pollId),
        eq(streamPollVotes.userId, user.id)
      ),
    });

    return NextResponse.json({
      hasVoted: !!vote,
      votedOption: vote?.optionIndex ?? null,
    });
  } catch (error: any) {
    console.error('Error checking vote:', error);
    return NextResponse.json(
      { error: 'Failed to check vote' },
      { status: 500 }
    );
  }
}
