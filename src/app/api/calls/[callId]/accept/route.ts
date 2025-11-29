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

    const call = await CallService.acceptCall(callId, user.id);

    // Notify the fan that their call was accepted via Ably
    await AblyRealtimeService.broadcastCallUpdate(callId, 'call_accepted', {
      callId,
      creatorId: user.id,
      roomName: call.roomName,
    });

    return NextResponse.json({
      call,
      message: 'Call accepted! The fan will be notified.',
    });
  } catch (error: any) {
    console.error('Error accepting call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept call' },
      { status: 400 }
    );
  }
}
