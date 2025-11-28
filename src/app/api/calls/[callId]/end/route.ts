import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';
import { db, calls } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

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

    // Get call info before ending to notify the other party
    const callBefore = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    const call = await CallService.endCall(callId, user.id);

    // Broadcast call ended event to both participants
    if (callBefore) {
      await supabase.channel(`call:${callId}`).send({
        type: 'broadcast',
        event: 'call_ended',
        payload: {
          callId,
          endedBy: user.id,
          duration: call.durationSeconds,
          charged: call.actualCoins,
        },
      });
    }

    return NextResponse.json({
      call,
      message: 'Call ended successfully',
      duration: call.durationSeconds,
      charged: call.actualCoins,
    });
  } catch (error: any) {
    console.error('Error ending call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end call' },
      { status: 400 }
    );
  }
}
