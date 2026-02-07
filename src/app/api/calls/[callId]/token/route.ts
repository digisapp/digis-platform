import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { calls } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { LiveKitService } from '@/lib/services/livekit-service';
import { rateLimit } from '@/lib/rate-limit';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    // Rate limit token requests to prevent abuse (10/min per IP)
    const rateLimitResult = await rateLimit(request, 'call-token');
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: 'Too many token requests' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const { callId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the call
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
      with: {
        fan: {
          columns: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify user is part of the call
    if (call.fanId !== user.id && call.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You are not part of this call' },
        { status: 403 }
      );
    }

    // Call must be accepted or active
    if (call.status !== 'accepted' && call.status !== 'active') {
      return NextResponse.json(
        { error: `Call is ${call.status}. Must be accepted or active to join.` },
        { status: 400 }
      );
    }

    if (!call.roomName) {
      return NextResponse.json(
        { error: 'Room name not generated' },
        { status: 500 }
      );
    }

    // Determine participant info
    const isFan = call.fanId === user.id;
    const participant = isFan ? call.fan : call.creator;
    const participantName = participant.displayName || participant.username || 'User';

    // Generate LiveKit token
    const token = await LiveKitService.generateToken(
      call.roomName,
      participantName,
      user.id
    );

    return NextResponse.json({
      token,
      roomName: call.roomName,
      participantName,
      wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error: any) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}
