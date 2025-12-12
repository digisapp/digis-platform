import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

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

    // Get optional decline reason from request body
    let declineReason: string | undefined;
    try {
      const body = await request.json();
      declineReason = body.reason?.trim().slice(0, 200);
    } catch {
      // No body or invalid JSON is fine
    }

    const call = await CallService.rejectCall(callId, user.id);

    // Notify the fan that their call was rejected via Ably
    await AblyRealtimeService.broadcastCallUpdate(callId, 'call_rejected', {
      callId,
      creatorId: user.id,
      reason: declineReason || null,
    });

    return NextResponse.json({
      call,
      message: 'Call rejected.',
    });
  } catch (error: any) {
    console.error('Error rejecting call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject call' },
      { status: 400 }
    );
  }
}
