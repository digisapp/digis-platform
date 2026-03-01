import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { availabilityOverrides } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/availability/override
 * Add a date-specific override (block a day or set custom hours)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, isBlocked, customStartTime, customEndTime, reason } = body;

    if (!date) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    // Don't allow overrides in the past
    const overrideDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (overrideDate < today) {
      return NextResponse.json({ error: 'Cannot override past dates' }, { status: 400 });
    }

    // Upsert override
    const existing = await db.query.availabilityOverrides.findFirst({
      where: and(
        eq(availabilityOverrides.creatorId, user.id),
        eq(availabilityOverrides.date, date),
      ),
    });

    let result;
    if (existing) {
      [result] = await db
        .update(availabilityOverrides)
        .set({
          isBlocked: isBlocked !== undefined ? isBlocked : true,
          customStartTime: customStartTime || null,
          customEndTime: customEndTime || null,
          reason: reason || null,
        })
        .where(eq(availabilityOverrides.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(availabilityOverrides)
        .values({
          creatorId: user.id,
          date,
          isBlocked: isBlocked !== undefined ? isBlocked : true,
          customStartTime: customStartTime || null,
          customEndTime: customEndTime || null,
          reason: reason || null,
        })
        .returning();
    }

    return NextResponse.json({ override: result });
  } catch (error: any) {
    console.error('Error creating override:', error);
    return NextResponse.json(
      { error: 'Failed to create override' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings/availability/override
 * Remove a date override
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const overrideId = searchParams.get('id');

    if (!overrideId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await db
      .delete(availabilityOverrides)
      .where(and(
        eq(availabilityOverrides.id, overrideId),
        eq(availabilityOverrides.creatorId, user.id),
      ))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting override:', error);
    return NextResponse.json(
      { error: 'Failed to delete override' },
      { status: 500 }
    );
  }
}
