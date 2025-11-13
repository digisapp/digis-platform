import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { calls } from '@/lib/data/system';
import { eq, and, gte, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all calls where user is the receiver (creator)
    const creatorCalls = await db.query.calls.findMany({
      where: eq(calls.creatorId, user.id),
    });

    // Calculate stats
    const totalCalls = creatorCalls.filter(c => c.status === 'completed').length;
    const callsToday = creatorCalls.filter(
      c => c.status === 'completed' && new Date(c.createdAt) >= today
    ).length;

    // Calculate total minutes
    const totalMinutes = creatorCalls.reduce((sum, call) => {
      if (call.status === 'completed' && call.durationSeconds) {
        return sum + Math.floor(call.durationSeconds / 60);
      }
      return sum;
    }, 0);

    // Calculate total earnings
    const totalEarnings = creatorCalls.reduce((sum, call) => {
      if (call.status === 'completed' && call.actualCoins) {
        return sum + call.actualCoins;
      }
      return sum;
    }, 0);

    // Count pending requests
    const pendingRequests = creatorCalls.filter(c => c.status === 'pending').length;

    // Calculate average rating (simplified - would need ratings table)
    const averageRating = 4.8; // Placeholder

    return NextResponse.json({
      totalCalls,
      totalMinutes,
      totalEarnings,
      averageRating,
      callsToday,
      pendingRequests,
    });
  } catch (error) {
    console.error('[calls/stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call stats' },
      { status: 500 }
    );
  }
}
