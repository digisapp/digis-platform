import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streamGoals, creatorSettings, shows, subscriptionTiers } from '@/lib/data/system';
import { eq, and, gt } from 'drizzle-orm';

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
      // Get subscription price if stream requires subscription
      let subscriptionPrice: number | undefined;
      if (stream.privacy === 'subscribers' && stream.creatorId) {
        const tier = await db.query.subscriptionTiers.findFirst({
          where: and(
            eq(subscriptionTiers.creatorId, stream.creatorId),
            eq(subscriptionTiers.isActive, true)
          ),
          columns: { pricePerMonth: true },
        });
        subscriptionPrice = tier?.pricePerMonth;
      }

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
          subscriptionPrice,
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

    // Fetch VIP mode info if active on this stream
    let activeVipShow = null;
    if (stream.activeVipShowId) {
      activeVipShow = await db.query.shows.findFirst({
        where: eq(shows.id, stream.activeVipShowId),
        columns: {
          id: true,
          title: true,
          ticketPrice: true,
          scheduledStart: true,
        },
      });
    }

    // Fetch upcoming/pending ticketed show from this stream (for late-joining viewers)
    // This is set when creator announces a ticketed show from an active broadcast
    // Only look for scheduled shows if VIP mode is not already active
    const upcomingShow = (!stream.activeVipShowId && stream.creatorId) ? await db.query.shows.findFirst({
      where: and(
        eq(shows.creatorId, stream.creatorId),
        eq(shows.status, 'scheduled')
      ),
      columns: {
        id: true,
        title: true,
        ticketPrice: true,
        scheduledStart: true,
      },
    }) : null;

    // Return stream with goals, call settings, and upcoming ticketed show
    return NextResponse.json({
      stream: {
        ...stream,
        goals: goals.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          rewardText: g.rewardText,
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
        upcomingTicketedShow: upcomingShow ? {
          id: upcomingShow.id,
          title: upcomingShow.title,
          ticketPrice: upcomingShow.ticketPrice,
          startsAt: upcomingShow.scheduledStart?.toISOString(),
        } : null,
        // VIP mode state (for restoring after page refresh)
        vipModeActive: !!stream.activeVipShowId,
        activeVipShow: activeVipShow ? {
          id: activeVipShow.id,
          title: activeVipShow.title,
          ticketPrice: activeVipShow.ticketPrice,
          startsAt: activeVipShow.scheduledStart?.toISOString(),
        } : null,
        vipStartedAt: stream.vipStartedAt?.toISOString() || null,
      }
    });
  } catch (error: any) {
    console.error('Error fetching stream:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream' },
      { status: 500 }
    );
  }
}
