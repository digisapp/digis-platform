import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CallService } from '@/lib/calls/call-service';
import { LiveKitTokenService } from '@/lib/livekit/token-service';
import { db } from '@/db';
import { calls } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get call details
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify user is a participant
    if (call.fanId !== user.id && call.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only generate token for accepted or active calls
    if (!['accepted', 'active'].includes(call.status)) {
      return NextResponse.json(
        { error: 'Call is not ready' },
        { status: 400 }
      );
    }

    if (!call.roomName) {
      return NextResponse.json(
        { error: 'Room not created' },
        { status: 500 }
      );
    }

    // Generate LiveKit token
    const token = LiveKitTokenService.generateToken({
      roomName: call.roomName,
      participantName: user.email || user.id,
      participantId: user.id,
      metadata: {
        role: call.fanId === user.id ? 'fan' : 'creator',
        callId: call.id,
      },
    });

    return NextResponse.json({
      token,
      roomName: call.roomName,
      livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
