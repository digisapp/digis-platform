import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms, groupRoomParticipants, wallets, walletTransactions, spendHolds } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms/[roomId]/join
 * Join a group room (payment depends on priceType)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await db.query.groupRooms.findFirst({
      where: eq(groupRooms.id, roomId),
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'ended' || room.status === 'cancelled') {
      return NextResponse.json({ error: 'Room is no longer available' }, { status: 400 });
    }

    if (room.isLocked) {
      return NextResponse.json({ error: 'Room is locked' }, { status: 403 });
    }

    if (room.currentParticipants >= room.maxParticipants && user.id !== room.creatorId) {
      return NextResponse.json({ error: 'Room is full' }, { status: 409 });
    }

    // Check if already joined
    const existing = await db.query.groupRoomParticipants.findFirst({
      where: and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.userId, user.id),
      ),
    });

    if (existing && existing.status === 'joined') {
      return NextResponse.json({ alreadyJoined: true, participant: existing });
    }

    // Creator joins for free regardless
    if (user.id === room.creatorId) {
      const [participant] = await db
        .insert(groupRoomParticipants)
        .values({ roomId, userId: user.id })
        .onConflictDoNothing()
        .returning();

      await db
        .update(groupRooms)
        .set({
          currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
          totalParticipants: sql`${groupRooms.totalParticipants} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(groupRooms.id, roomId));

      return NextResponse.json({ participant: participant || existing });
    }

    // Handle payment based on price type
    if (room.priceType === 'free') {
      const [participant] = await db
        .insert(groupRoomParticipants)
        .values({ roomId, userId: user.id })
        .onConflictDoNothing()
        .returning();

      await db
        .update(groupRooms)
        .set({
          currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
          totalParticipants: sql`${groupRooms.totalParticipants} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(groupRooms.id, roomId));

      return NextResponse.json({ participant: participant || existing });
    }

    // Rate limit for paid rooms
    const { ok, error: rateLimitError } = await rateLimitFinancial(user.id, 'purchase');
    if (!ok) {
      return NextResponse.json({ error: rateLimitError }, { status: 429 });
    }

    if (room.priceType === 'flat') {
      // Flat fee: charge upfront
      const result = await db.transaction(async (tx) => {
        const [buyerWallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, user.id))
          .for('update');

        if (!buyerWallet || buyerWallet.balance - buyerWallet.heldBalance < room.priceCoins) {
          throw new Error('Insufficient balance');
        }

        const [debitTx] = await tx
          .insert(walletTransactions)
          .values({
            userId: user.id,
            amount: -room.priceCoins,
            type: 'group_room_payment',
            status: 'completed',
            description: `Joined group room: ${room.title}`,
            idempotencyKey: `group-join-${user.id}-${roomId}`,
          })
          .onConflictDoNothing()
          .returning();

        if (!debitTx) {
          throw new Error('Already processed');
        }

        const [creditTx] = await tx
          .insert(walletTransactions)
          .values({
            userId: room.creatorId,
            amount: room.priceCoins,
            type: 'group_room_earnings',
            status: 'completed',
            description: `Group room participant joined: ${room.title}`,
            idempotencyKey: `group-earn-${room.creatorId}-${user.id}-${roomId}`,
            relatedTransactionId: debitTx.id,
          })
          .returning();

        await tx
          .update(walletTransactions)
          .set({ relatedTransactionId: creditTx.id })
          .where(eq(walletTransactions.id, debitTx.id));

        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${room.priceCoins}`, updatedAt: new Date() })
          .where(eq(wallets.userId, user.id));

        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${room.priceCoins}`, updatedAt: new Date() })
          .where(eq(wallets.userId, room.creatorId));

        const [participant] = await tx
          .insert(groupRoomParticipants)
          .values({ roomId, userId: user.id, coinsCharged: room.priceCoins })
          .returning();

        await tx
          .update(groupRooms)
          .set({
            currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
            totalParticipants: sql`${groupRooms.totalParticipants} + 1`,
            totalEarnings: sql`${groupRooms.totalEarnings} + ${room.priceCoins}`,
            updatedAt: new Date(),
          })
          .where(eq(groupRooms.id, roomId));

        return { participant, charged: room.priceCoins };
      });

      return NextResponse.json(result);
    }

    if (room.priceType === 'per_minute') {
      // Per-minute: create hold, charge on leave/end
      const estimatedMinutes = 60; // Estimate 1 hour max
      const holdAmount = room.priceCoins * estimatedMinutes;

      const result = await db.transaction(async (tx) => {
        const [buyerWallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, user.id))
          .for('update');

        if (!buyerWallet || buyerWallet.balance - buyerWallet.heldBalance < holdAmount) {
          throw new Error('Insufficient balance');
        }

        // Create spend hold
        const [hold] = await tx
          .insert(spendHolds)
          .values({
            userId: user.id,
            amount: holdAmount,
            purpose: 'group_room',
            relatedId: roomId,
          })
          .returning();

        // Update held balance
        await tx
          .update(wallets)
          .set({
            heldBalance: sql`${wallets.heldBalance} + ${holdAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, user.id));

        const [participant] = await tx
          .insert(groupRoomParticipants)
          .values({ roomId, userId: user.id, holdId: hold.id })
          .returning();

        await tx
          .update(groupRooms)
          .set({
            currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
            totalParticipants: sql`${groupRooms.totalParticipants} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(groupRooms.id, roomId));

        return { participant, holdAmount };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid price type' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }
    if (error.message === 'Already processed') {
      return NextResponse.json({ alreadyJoined: true });
    }
    console.error('Error joining group room:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to join room' },
      { status: 500 }
    );
  }
}
