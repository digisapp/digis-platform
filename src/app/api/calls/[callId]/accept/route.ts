import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CallService } from '@/lib/services/call-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { assertValidOrigin } from '@/lib/security/origin-check';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  // CSRF origin validation
  const originCheck = assertValidOrigin(request, { requireHeader: true });
  if (!originCheck.ok) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  try {
    const { callId } = await params;

    // Validate callId is a valid UUID
    if (!z.string().uuid().safeParse(callId).success) {
      return NextResponse.json({ error: 'Invalid call ID' }, { status: 400 });
    }

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
