import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorAvailability, availabilityOverrides, bookings, creatorSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/slots/[creatorId]?date=2026-02-20
 * Get available time slots for a specific date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'date query param required (YYYY-MM-DD)' }, { status: 400 });
    }

    const requestedDate = new Date(date + 'T00:00:00');
    const dayOfWeek = requestedDate.getDay(); // 0=Sunday

    // Check for date override
    const override = await db.query.availabilityOverrides.findFirst({
      where: and(
        eq(availabilityOverrides.creatorId, creatorId),
        eq(availabilityOverrides.date, date),
      ),
    });

    // If day is blocked, no slots
    if (override?.isBlocked) {
      return NextResponse.json({ slots: [], blocked: true, reason: override.reason || 'Unavailable' });
    }

    // Get regular schedule for this day
    const schedule = await db.query.creatorAvailability.findFirst({
      where: and(
        eq(creatorAvailability.creatorId, creatorId),
        eq(creatorAvailability.dayOfWeek, dayOfWeek),
        eq(creatorAvailability.isActive, true),
      ),
    });

    if (!schedule && !override) {
      return NextResponse.json({ slots: [], reason: 'No availability set for this day' });
    }

    // Use override times if set, otherwise regular schedule
    const startTime = override?.customStartTime || schedule?.startTime;
    const endTime = override?.customEndTime || schedule?.endTime;
    const slotDuration = schedule?.slotDurationMinutes || 30;
    const timezone = schedule?.timezone || 'America/New_York';

    if (!startTime || !endTime) {
      return NextResponse.json({ slots: [], reason: 'No availability set for this day' });
    }

    // Generate slots
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const slots: { startTime: string; endTime: string; available: boolean }[] = [];
    for (let m = startMinutes; m + slotDuration <= endMinutes; m += slotDuration) {
      const slotStartH = Math.floor(m / 60).toString().padStart(2, '0');
      const slotStartM = (m % 60).toString().padStart(2, '0');
      const slotEndMin = m + slotDuration;
      const slotEndH = Math.floor(slotEndMin / 60).toString().padStart(2, '0');
      const slotEndM = (slotEndMin % 60).toString().padStart(2, '0');

      slots.push({
        startTime: `${slotStartH}:${slotStartM}`,
        endTime: `${slotEndH}:${slotEndM}`,
        available: true,
      });
    }

    // Get existing confirmed bookings for this date to mark slots as taken
    const dateStart = new Date(date + 'T00:00:00Z');
    const dateEnd = new Date(date + 'T23:59:59Z');

    const existingBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.creatorId, creatorId),
        eq(bookings.status, 'confirmed'),
      ),
      columns: { scheduledStart: true, scheduledEnd: true },
    });

    // Filter bookings to this date and mark slots as unavailable
    const dateStr = date;
    for (const booking of existingBookings) {
      const bookingDate = booking.scheduledStart.toISOString().split('T')[0];
      if (bookingDate !== dateStr) continue;

      const bookingStartH = booking.scheduledStart.getUTCHours();
      const bookingStartM = booking.scheduledStart.getUTCMinutes();
      const bookingTime = `${bookingStartH.toString().padStart(2, '0')}:${bookingStartM.toString().padStart(2, '0')}`;

      const slot = slots.find(s => s.startTime === bookingTime);
      if (slot) {
        slot.available = false;
      }
    }

    // Filter out past slots if date is today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (date === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      for (const slot of slots) {
        const [h, m] = slot.startTime.split(':').map(Number);
        if (h * 60 + m <= currentMinutes) {
          slot.available = false;
        }
      }
    }

    // Get creator's call settings for rate info
    const settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, creatorId),
      columns: {
        callRatePerMinute: true,
        voiceCallRatePerMinute: true,
      },
    });

    return NextResponse.json({
      slots: slots.filter(s => s.available),
      allSlots: slots,
      slotDurationMinutes: slotDuration,
      timezone,
      rates: settings ? {
        videoPerMinute: settings.callRatePerMinute,
        voicePerMinute: settings.voiceCallRatePerMinute,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch slots' },
      { status: 500 }
    );
  }
}
