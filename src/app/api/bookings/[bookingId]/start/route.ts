import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { bookings, calls, creatorSettings } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { LiveKitService } from '@/lib/services/livekit-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[bookingId]/start
 * Start a call from a booking (within 5 minutes of scheduled time)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.id, bookingId),
        or(eq(bookings.creatorId, user.id), eq(bookings.fanId, user.id)),
      ),
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'confirmed') {
      return NextResponse.json({ error: 'Booking is not confirmed' }, { status: 400 });
    }

    // If call already linked, return existing
    if (booking.callId) {
      const existingCall = await db.query.calls.findFirst({
        where: eq(calls.id, booking.callId),
      });
      if (existingCall) {
        return NextResponse.json({ call: existingCall, alreadyStarted: true });
      }
    }

    // Check timing: within 5 minutes before or 30 minutes after scheduled start
    const now = new Date();
    const minutesUntil = (booking.scheduledStart.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntil > 5) {
      return NextResponse.json({
        error: 'Too early to start. You can join 5 minutes before the scheduled time.',
        minutesUntil: Math.ceil(minutesUntil),
      }, { status: 400 });
    }

    if (minutesUntil < -30) {
      return NextResponse.json({ error: 'Booking window has expired' }, { status: 400 });
    }

    // Get creator settings for rate
    const settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, booking.creatorId),
    });

    const ratePerMinute = booking.callType === 'voice'
      ? (settings?.voiceCallRatePerMinute || 15)
      : (settings?.callRatePerMinute || 25);

    // Create a call record (skip the request/accept flow since it's pre-booked + pre-paid)
    const roomName = `booking-${nanoid(16)}`;
    const [call] = await db
      .insert(calls)
      .values({
        fanId: booking.fanId,
        creatorId: booking.creatorId,
        callType: booking.callType,
        status: 'accepted', // Skip pending, go straight to accepted
        ratePerMinute,
        roomName,
        acceptedAt: now,
      })
      .returning();

    // Link call to booking
    await db
      .update(bookings)
      .set({ callId: call.id, updatedAt: now })
      .where(eq(bookings.id, bookingId));

    // Generate LiveKit token for the user
    const isCreator = user.id === booking.creatorId;
    const participantName = isCreator ? 'Creator' : 'Fan';

    const token = await LiveKitService.generateToken(
      roomName,
      participantName,
      user.id,
    );

    return NextResponse.json({
      call,
      token,
      roomName,
      wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error: any) {
    console.error('Error starting booking call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start call' },
      { status: 500 }
    );
  }
}
