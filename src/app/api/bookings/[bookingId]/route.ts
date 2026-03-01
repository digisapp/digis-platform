import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { bookings } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/[bookingId]
 * Get booking details (participant only)
 */
export async function GET(
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
      with: {
        creator: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
        fan: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}
