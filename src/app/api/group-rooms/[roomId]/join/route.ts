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

    // Check if already joined (handle re-join for left/removed)
    const existing = await db.query.groupRoomParticipants.findFirst({
      where: and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.userId, user.id),
      ),
    });

    if (existing && existing.status === 'joined') {
      return NextResponse.json({ alreadyJoined: true, participant: existing });
    }

    // Use transaction with row lock to prevent capacity race condition
    const result = await db.transaction(async (tx) => {
      // Lock room row to prevent concurrent joins exceeding capacity
      const [room] = await tx
        .select()
        .from(groupRooms)
        .where(eq(groupRooms.id, roomId))
        .for('update');

      if (!room) {
        throw new Error('NOT_FOUND');
      }

      if (room.status === 'ended' || room.status === 'cancelled') {
        throw new Error('ROOM_CLOSED');
      }

      if (room.isLocked && user.id !== room.creatorId) {
        throw new Error('ROOM_LOCKED');
      }

      if (room.currentParticipants >= room.maxParticipants && user.id !== room.creatorId) {
        throw new Error('ROOM_FULL');
      }

      // Handle re-join: update existing row instead of inserting
      let participant;
      if (existing) {
        [participant] = await tx
          .update(groupRoomParticipants)
          .set({ status: 'joined', joinedAt: new Date(), leftAt: null, durationSeconds: null, coinsCharged: 0, holdId: null })
          .where(eq(groupRoomParticipants.id, existing.id))
          .returning();
      }

      // Creator joins for free regardless
      if (user.id === room.creatorId) {
        if (!participant) {
          [participant] = await tx
            .insert(groupRoomParticipants)
            .values({ roomId, userId: user.id })
            .returning();
        }

        await tx.update(groupRooms).set({
          currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
          totalParticipants: existing ? groupRooms.totalParticipants : sql`${groupRooms.totalParticipants} + 1`,
          updatedAt: new Date(),
        }).where(eq(groupRooms.id, roomId));

        return { participant };
      }

      // Free room
      if (room.priceType === 'free') {
        if (!participant) {
          [participant] = await tx
            .insert(groupRoomParticipants)
            .values({ roomId, userId: user.id })
            .returning();
        }

        await tx.update(groupRooms).set({
          currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
          totalParticipants: existing ? groupRooms.totalParticipants : sql`${groupRooms.totalParticipants} + 1`,
          updatedAt: new Date(),
        }).where(eq(groupRooms.id, roomId));

        return { participant };
      }

      // Rate limit for paid rooms
      const { ok } = await rateLimitFinancial(user.id, 'purchase');
      if (!ok) {
        throw new Error('RATE_LIMITED');
      }

      if (room.priceType === 'flat') {
        // Flat fee: charge upfront
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
            idempotencyKey: `group-join-${user.id}-${roomId}-${Date.now()}`,
          })
          .returning();

        const [creditTx] = await tx
          .insert(walletTransactions)
          .values({
            userId: room.creatorId,
            amount: room.priceCoins,
            type: 'group_room_earnings',
            status: 'completed',
            description: `Group room participant joined: ${room.title}`,
            idempotencyKey: `group-earn-${room.creatorId}-${user.id}-${roomId}-${Date.now()}`,
            relatedTransactionId: debitTx.id,
          })
          .returning();

        await tx.update(walletTransactions).set({ relatedTransactionId: creditTx.id }).where(eq(walletTransactions.id, debitTx.id));
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${room.priceCoins}`, updatedAt: new Date() }).where(eq(wallets.userId, user.id));
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${room.priceCoins}`, updatedAt: new Date() }).where(eq(wallets.userId, room.creatorId));

        if (!participant) {
          [participant] = await tx
            .insert(groupRoomParticipants)
            .values({ roomId, userId: user.id, coinsCharged: room.priceCoins })
            .returning();
        } else {
          [participant] = await tx
            .update(groupRoomParticipants)
            .set({ coinsCharged: room.priceCoins })
            .where(eq(groupRoomParticipants.id, participant.id))
            .returning();
        }

        await tx.update(groupRooms).set({
          currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
          totalParticipants: existing ? groupRooms.totalParticipants : sql`${groupRooms.totalParticipants} + 1`,
          totalEarnings: sql`${groupRooms.totalEarnings} + ${room.priceCoins}`,
          updatedAt: new Date(),
        }).where(eq(groupRooms.id, roomId));

        return { participant, charged: room.priceCoins };
      }

      if (room.priceType === 'per_minute') {
        const estimatedMinutes = 60;
        const holdAmount = room.priceCoins * estimatedMinutes;

        const [buyerWallet] = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, user.id))
          .for('update');

        if (!buyerWallet || buyerWallet.balance - buyerWallet.heldBalance < holdAmount) {
          throw new Error('Insufficient balance');
        }

        const [hold] = await tx
          .insert(spendHolds)
          .values({ userId: user.id, amount: holdAmount, purpose: 'group_room', relatedId: roomId })
          .returning();

        await tx.update(wallets).set({
          heldBalance: sql`${wallets.heldBalance} + ${holdAmount}`,
          updatedAt: new Date(),
        }).where(eq(wallets.userId, user.id));

        if (!participant) {
          [participant] = await tx
            .insert(groupRoomParticipants)
            .values({ roomId, userId: user.id, holdId: hold.id })
            .returning();
        } else {
          [participant] = await tx
            .update(groupRoomParticipants)
            .set({ holdId: hold.id })
            .where(eq(groupRoomParticipants.id, participant.id))
            .returning();
        }

        await tx.update(groupRooms).set({
          currentParticipants: sql`${groupRooms.currentParticipants} + 1`,
          totalParticipants: existing ? groupRooms.totalParticipants : sql`${groupRooms.totalParticipants} + 1`,
          updatedAt: new Date(),
        }).where(eq(groupRooms.id, roomId));

        return { participant, holdAmount };
      }

      throw new Error('Invalid price type');
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (error.message === 'ROOM_CLOSED') return NextResponse.json({ error: 'Room is no longer available' }, { status: 400 });
    if (error.message === 'ROOM_LOCKED') return NextResponse.json({ error: 'Room is locked' }, { status: 403 });
    if (error.message === 'ROOM_FULL') return NextResponse.json({ error: 'Room is full' }, { status: 409 });
    if (error.message === 'RATE_LIMITED') return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    if (error.message === 'Insufficient balance') return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    console.error('Error joining group room:', error);
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
