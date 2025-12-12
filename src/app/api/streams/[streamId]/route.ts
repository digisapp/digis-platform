import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streamGoals, creatorSettings } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    // Get current user ID
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Get stream first to determine creator info
    const stream = await StreamService.getStream(streamId);

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Check access control
    const accessCheck = await StreamService.checkStreamAccess(streamId, userId);

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        {
          error: accessCheck.reason || 'Access denied',
          accessDenied: true,
          creatorId: stream.creator?.id,
          creatorUsername: stream.creator?.username,
          requiresSubscription: stream.privacy === 'subscribers',
          requiresFollow: stream.privacy === 'followers',
          requiresTicket: stream.privacy === 'ticketed',
          ticketPrice: stream.privacy === 'ticketed' ? stream.ticketPrice : undefined,
        },
        { status: 403 }
      );
    }

    // Fetch active goals for the stream (only show active, non-completed goals to viewers)
    const goals = await db.query.streamGoals.findMany({
      where: and(
        eq(streamGoals.streamId, streamId),
        eq(streamGoals.isActive, true)
      ),
    });

    // Fetch creator's call settings for the video call button
    const callSettings = stream.creatorId ? await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, stream.creatorId),
    }) : null;

    // Return stream with goals and call settings
    return NextResponse.json({
      stream: {
        ...stream,
        goals: goals.map(g => ({
          id: g.id,
          description: g.description,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          isActive: g.isActive,
          isCompleted: g.isCompleted,
        })),
        creatorCallSettings: callSettings ? {
          isAvailableForCalls: callSettings.isAvailableForCalls,
          isAvailableForVoiceCalls: callSettings.isAvailableForVoiceCalls,
          callRatePerMinute: callSettings.callRatePerMinute,
          voiceCallRatePerMinute: callSettings.voiceCallRatePerMinute,
          minimumCallDuration: callSettings.minimumCallDuration,
          minimumVoiceCallDuration: callSettings.minimumVoiceCallDuration,
        } : null,
      }
    });
  } catch (error: any) {
    console.error('Error fetching stream:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stream' },
      { status: 500 }
    );
  }
}
