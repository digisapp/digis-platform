import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorAvailability, availabilityOverrides } from '@/db/schema';
import { eq, and, asc, gte } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/availability/[creatorId]
 * Get creator's public availability (for fans to see when they can book)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    // Get weekly schedule
    const schedule = await db.query.creatorAvailability.findMany({
      where: and(
        eq(creatorAvailability.creatorId, creatorId),
        eq(creatorAvailability.isActive, true),
      ),
      orderBy: [asc(creatorAvailability.dayOfWeek)],
      columns: {
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        slotDurationMinutes: true,
        timezone: true,
      },
    });

    // Get upcoming overrides (next 30 days)
    const today = new Date().toISOString().split('T')[0];
    const overrides = await db.query.availabilityOverrides.findMany({
      where: and(
        eq(availabilityOverrides.creatorId, creatorId),
        gte(availabilityOverrides.date, today),
      ),
      columns: {
        date: true,
        isBlocked: true,
        customStartTime: true,
        customEndTime: true,
      },
    });

    return NextResponse.json({ schedule, overrides });
  } catch (error: any) {
    console.error('Error fetching creator availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
