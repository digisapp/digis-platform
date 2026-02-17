import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { bookings, wallets, walletTransactions } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

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

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

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
      return NextResponse.json({ error: 'Booking cannot be cancelled' }, { status: 400 });
    }

    // Calculate refund
    const now = new Date();
    const hoursUntilBooking = (booking.scheduledStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isCreatorCancelling = user.id === booking.creatorId;

    let refundPercent: number;
    if (isCreatorCancelling) {
      refundPercent = 100; // Creator always refunds 100%
    } else if (hoursUntilBooking >= 24) {
      refundPercent = 100;
    } else if (hoursUntilBooking >= 1) {
      refundPercent = 50;
    } else {
      refundPercent = 0;
    }

    const refundAmount = Math.floor(booking.coinsCharged * refundPercent / 100);

    const result = await db.transaction(async (tx) => {
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

      // Process refund if any
      if (refundAmount > 0) {
        // Debit creator (return coins)
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

        // Credit fan (receive refund)
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

        // Link transactions
        await tx
          .update(walletTransactions)
          .set({ relatedTransactionId: creditTx.id })
          .where(eq(walletTransactions.id, debitTx.id));

        // Update wallets
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${refundAmount}`,
            updatedAt: now,
          })
          .where(eq(wallets.userId, booking.creatorId));

        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${refundAmount}`,
            updatedAt: now,
          })
          .where(eq(wallets.userId, booking.fanId));

        // Store refund transaction ID on booking
        await tx
          .update(bookings)
          .set({ refundTransactionId: creditTx.id })
          .where(eq(bookings.id, bookingId));
      }

      return { booking: updated, refundAmount, refundPercent };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
