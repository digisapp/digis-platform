import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { bookings, creatorSettings, wallets, walletTransactions } from '@/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings
 * Book a slot with a creator (fan pays upfront)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ok, error: rateLimitError } = await rateLimitFinancial(user.id, 'purchase');
    if (!ok) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    const body = await request.json();
    const { creatorId, callType, scheduledStart, notes } = body;

    if (!creatorId || !scheduledStart) {
      return NextResponse.json({ error: 'creatorId and scheduledStart are required' }, { status: 400 });
    }

    if (creatorId === user.id) {
      return NextResponse.json({ error: 'Cannot book a call with yourself' }, { status: 400 });
    }

    // Get creator settings for rate and slot duration
    const settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, creatorId),
    });

    if (!settings) {
      return NextResponse.json({ error: 'Creator not available for bookings' }, { status: 404 });
    }

    const type = callType === 'voice' ? 'voice' : 'video';
    const ratePerMinute = type === 'voice'
      ? settings.voiceCallRatePerMinute
      : settings.callRatePerMinute;

    // Default slot duration: use minimum call duration as slot length
    const slotDurationMinutes = type === 'voice'
      ? settings.minimumVoiceCallDuration
      : settings.minimumCallDuration;

    const startTime = new Date(scheduledStart);
    const endTime = new Date(startTime.getTime() + slotDurationMinutes * 60 * 1000);

    // Validate not in the past
    if (startTime <= new Date()) {
      return NextResponse.json({ error: 'Cannot book in the past' }, { status: 400 });
    }

    // Check for double-booking
    const existingBooking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.creatorId, creatorId),
        eq(bookings.scheduledStart, startTime),
        eq(bookings.status, 'confirmed'),
      ),
    });

    if (existingBooking) {
      return NextResponse.json({ error: 'This slot is already booked' }, { status: 409 });
    }

    const totalCost = ratePerMinute * slotDurationMinutes;

    // Process payment and create booking in transaction
    const result = await db.transaction(async (tx) => {
      // Lock buyer wallet
      const [buyerWallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, user.id))
        .for('update');

      if (!buyerWallet || buyerWallet.balance - buyerWallet.heldBalance < totalCost) {
        throw new Error('Insufficient balance');
      }

      // Debit fan
      const idempotencyKey = `booking-${user.id}-${creatorId}-${startTime.toISOString()}`;
      const [debitTx] = await tx
        .insert(walletTransactions)
        .values({
          userId: user.id,
          amount: -totalCost,
          type: 'booking_payment',
          status: 'completed',
          description: `Booked ${type} call for ${startTime.toLocaleDateString()}`,
          idempotencyKey,
        })
        .onConflictDoNothing()
        .returning();

      if (!debitTx) {
        throw new Error('Booking already processed');
      }

      // Credit creator
      const [creditTx] = await tx
        .insert(walletTransactions)
        .values({
          userId: creatorId,
          amount: totalCost,
          type: 'booking_earnings',
          status: 'completed',
          description: `Booking received for ${type} call`,
          idempotencyKey: `booking-earn-${creatorId}-${user.id}-${startTime.toISOString()}`,
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
          balance: sql`${wallets.balance} - ${totalCost}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, user.id));

      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${totalCost}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, creatorId));

      // Create booking
      const [booking] = await tx
        .insert(bookings)
        .values({
          creatorId,
          fanId: user.id,
          callType: type,
          scheduledStart: startTime,
          scheduledEnd: endTime,
          coinsCharged: totalCost,
          transactionId: debitTx.id,
          notes: notes || null,
        })
        .returning();

      return { booking, charged: totalCost };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }
    if (error.message === 'Booking already processed') {
      return NextResponse.json({ error: 'Booking already processed' }, { status: 409 });
    }
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings
 * List user's bookings (as creator or fan)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'all'; // 'creator', 'fan', or 'all'

    let where;
    if (role === 'creator') {
      where = eq(bookings.creatorId, user.id);
    } else if (role === 'fan') {
      where = eq(bookings.fanId, user.id);
    } else {
      where = or(eq(bookings.creatorId, user.id), eq(bookings.fanId, user.id));
    }

    const result = await db.query.bookings.findMany({
      where,
      orderBy: [desc(bookings.scheduledStart)],
      with: {
        creator: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
        fan: {
          columns: { id: true, displayName: true, username: true, avatarUrl: true },
        },
      },
      limit: 50,
    });

    return NextResponse.json({ bookings: result });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
