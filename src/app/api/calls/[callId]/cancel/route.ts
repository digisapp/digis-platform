import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/calls/call-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { db } from '@/lib/data/system';
import { calls } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the call first to find the creator ID
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Only the fan who initiated the call can cancel it
    if (call.fanId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Cancel the call (releases the hold)
    const cancelledCall = await CallService.cancelCall(callId, user.id, 'Cancelled by fan');

    // Notify the creator that the call was cancelled
    await AblyRealtimeService.broadcastCallCancelled(call.creatorId, {
      callId,
      fanId: user.id,
      reason: 'Fan cancelled the request',
    });

    return NextResponse.json({
      call: cancelledCall,
      message: 'Call cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel call' },
      { status: 400 }
    );
  }
}
