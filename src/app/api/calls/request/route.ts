import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { BlockService } from '@/lib/services/block-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, callType = 'video' } = await request.json();

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    // Check if user is blocked by the creator
    const isBlocked = await BlockService.isBlockedByCreator(creatorId, user.id);
    if (isBlocked) {
      return NextResponse.json(
        { error: 'Unable to request call with this creator' },
        { status: 403 }
      );
    }

    // Request the call
    const call = await CallService.requestCall(user.id, creatorId, callType);

    // Get fan details for the notification
    const fan = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    // Broadcast real-time notification to creator via Ably (scales to 50k+)
    await AblyRealtimeService.broadcastCallRequest(creatorId, {
      callId: call.id,
      fanId: user.id,
      callType: call.callType,
      ratePerMinute: call.ratePerMinute,
      estimatedCoins: call.estimatedCoins,
      fan,
    });

    return NextResponse.json({
      call,
      message: 'Call requested successfully! The creator will be notified.',
    });
  } catch (error: any) {
    console.error('Error requesting call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to request call' },
      { status: 400 }
    );
  }
}
