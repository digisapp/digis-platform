import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { creatorAvailability } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/availability
 * Get creator's own availability schedule
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const availability = await db.query.creatorAvailability.findMany({
      where: eq(creatorAvailability.creatorId, user.id),
      orderBy: [asc(creatorAvailability.dayOfWeek)],
    });

    return NextResponse.json({ availability });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings/availability
 * Set/update availability for a day of week (creator only)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dayOfWeek, startTime, endTime, slotDurationMinutes, isActive, timezone } = body;

    if (dayOfWeek === undefined || typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: 'dayOfWeek must be 0-6 (Sunday-Saturday)' }, { status: 400 });
    }

    if (!startTime || !endTime) {
      return NextResponse.json({ error: 'startTime and endTime are required (HH:MM format)' }, { status: 400 });
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json({ error: 'Times must be in HH:MM 24h format' }, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: 'startTime must be before endTime' }, { status: 400 });
    }

    // Upsert availability for this day
    const existing = await db.query.creatorAvailability.findFirst({
      where: and(
        eq(creatorAvailability.creatorId, user.id),
        eq(creatorAvailability.dayOfWeek, dayOfWeek),
      ),
    });

    let result;
    if (existing) {
      [result] = await db
        .update(creatorAvailability)
        .set({
          startTime,
          endTime,
          slotDurationMinutes: slotDurationMinutes || 30,
          isActive: isActive !== undefined ? isActive : true,
          timezone: timezone || existing.timezone,
          updatedAt: new Date(),
        })
        .where(eq(creatorAvailability.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(creatorAvailability)
        .values({
          creatorId: user.id,
          dayOfWeek,
          startTime,
          endTime,
          slotDurationMinutes: slotDurationMinutes || 30,
          isActive: isActive !== undefined ? isActive : true,
          timezone: timezone || 'America/New_York',
        })
        .returning();
    }

    return NextResponse.json({ availability: result });
  } catch (error: any) {
    console.error('Error setting availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set availability' },
      { status: 500 }
    );
  }
}
