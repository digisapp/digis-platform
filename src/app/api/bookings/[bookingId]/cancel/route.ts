import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { bookings, wallets, walletTransactions } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[bookingId]/cancel
 * Cancel booking with refund logic:
 * - 24h+ before: 100% refund
 * - 1-24h before: 50% refund
 * - <1h before: no refund
 * - Creator cancels: always 100% refund
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

    const rateLimitResult = await rateLimit(request, 'tips');
    if (!rateLimitResult.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitResult.headers });
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Entire cancel + refund inside a single transaction with row locking
    const result = await db.transaction(async (tx) => {
      // Lock and read booking inside transaction (prevents TOCTOU race)
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.id, bookingId),
          or(eq(bookings.creatorId, user.id), eq(bookings.fanId, user.id)),
        ))
        .for('update');

      if (!booking) {
        throw new Error('NOT_FOUND');
      }

      if (booking.status !== 'confirmed') {
        throw new Error('CANNOT_CANCEL');
      }

      // Calculate refund
      const now = new Date();
      const hoursUntilBooking = (booking.scheduledStart.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isCreatorCancelling = user.id === booking.creatorId;

      let refundPercent: number;
      if (isCreatorCancelling) {
        refundPercent = 100;
      } else if (hoursUntilBooking >= 24) {
        refundPercent = 100;
      } else if (hoursUntilBooking >= 1) {
        refundPercent = 50;
      } else {
        refundPercent = 0;
      }

      const refundAmount = Math.floor(booking.coinsCharged * refundPercent / 100);

      // Update booking status
      const [updated] = await tx
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledBy: user.id,
          cancelledAt: now,
          cancellationReason: reason || null,
          refundAmount,
          updatedAt: now,
        })
        .where(eq(bookings.id, bookingId))
        .returning();

      if (refundAmount > 0) {
        // Lock both wallets before modifying
        await tx.select().from(wallets).where(eq(wallets.userId, booking.creatorId)).for('update');
        await tx.select().from(wallets).where(eq(wallets.userId, booking.fanId)).for('update');

        // Debit creator
        const [debitTx] = await tx
          .insert(walletTransactions)
          .values({
            userId: booking.creatorId,
            amount: -refundAmount,
            type: 'booking_refund',
            status: 'completed',
            description: `Booking cancellation refund (${refundPercent}%)`,
            idempotencyKey: `booking-refund-debit-${bookingId}`,
          })
          .returning();

        // Credit fan
        const [creditTx] = await tx
          .insert(walletTransactions)
          .values({
            userId: booking.fanId,
            amount: refundAmount,
            type: 'booking_refund',
            status: 'completed',
            description: `Booking refund received (${refundPercent}%)`,
            idempotencyKey: `booking-refund-credit-${bookingId}`,
            relatedTransactionId: debitTx.id,
          })
          .returning();

        await tx.update(walletTransactions).set({ relatedTransactionId: creditTx.id }).where(eq(walletTransactions.id, debitTx.id));
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${refundAmount}`, updatedAt: now }).where(eq(wallets.userId, booking.creatorId));
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${refundAmount}`, updatedAt: now }).where(eq(wallets.userId, booking.fanId));
        await tx.update(bookings).set({ refundTransactionId: creditTx.id }).where(eq(bookings.id, bookingId));
      }

      return { booking: updated, refundAmount, refundPercent };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (error.message === 'CANNOT_CANCEL') {
      return NextResponse.json({ error: 'Booking cannot be cancelled' }, { status: 400 });
    }
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}
