import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms, groupRoomParticipants, wallets, walletTransactions, spendHolds } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms/[roomId]/remove
 * Remove a participant from the room (creator only).
 * Settles per-minute holds so coins aren't locked forever.
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

    if (!room || room.creatorId !== user.id) {
      return NextResponse.json({ error: 'Room not found or not authorized' }, { status: 404 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const participant = await db.query.groupRoomParticipants.findFirst({
      where: and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.userId, userId),
        eq(groupRoomParticipants.status, 'joined'),
      ),
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found in room' }, { status: 404 });
    }

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - participant.joinedAt.getTime()) / 1000);
    let charged = 0;

    // Settle per-minute hold if applicable (so coins aren't locked forever)
    if (room.priceType === 'per_minute' && participant.holdId) {
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const charge = room.priceCoins * durationMinutes;

      await db.transaction(async (tx) => {
        const [hold] = await tx
          .select()
          .from(spendHolds)
          .where(eq(spendHolds.id, participant.holdId!))
          .for('update');

        if (hold && hold.status === 'active') {
          const actualCharge = Math.min(charge, hold.amount);

          const [debitTx] = await tx
            .insert(walletTransactions)
            .values({
              userId,
              amount: -actualCharge,
              type: 'group_room_payment',
              status: 'completed',
              description: `Group room (removed): ${room.title} (${durationMinutes} min)`,
              idempotencyKey: `group-remove-${userId}-${roomId}-${participant.id}`,
            })
            .returning();

          await tx.insert(walletTransactions).values({
            userId: room.creatorId,
            amount: actualCharge,
            type: 'group_room_earnings',
            status: 'completed',
            description: `Group room earnings: ${room.title}`,
            idempotencyKey: `group-remove-earn-${room.creatorId}-${userId}-${roomId}`,
            relatedTransactionId: debitTx.id,
          });

          await tx.update(wallets).set({
            balance: sql`${wallets.balance} - ${actualCharge}`,
            heldBalance: sql`${wallets.heldBalance} - ${hold.amount}`,
            updatedAt: now,
          }).where(eq(wallets.userId, userId));

          await tx.update(wallets).set({
            balance: sql`${wallets.balance} + ${actualCharge}`,
            updatedAt: now,
          }).where(eq(wallets.userId, room.creatorId));

          await tx.update(spendHolds).set({ status: 'settled', settledAt: now }).where(eq(spendHolds.id, hold.id));

          charged = actualCharge;
        }
      });
    }

    // Update participant status
    await db
      .update(groupRoomParticipants)
      .set({ status: 'removed', leftAt: now, durationSeconds, coinsCharged: charged || participant.coinsCharged })
      .where(eq(groupRoomParticipants.id, participant.id));

    // Decrement count + add earnings
    await db
      .update(groupRooms)
      .set({
        currentParticipants: sql`GREATEST(${groupRooms.currentParticipants} - 1, 0)`,
        totalEarnings: charged > 0 ? sql`${groupRooms.totalEarnings} + ${charged}` : groupRooms.totalEarnings,
        updatedAt: now,
      })
      .where(eq(groupRooms.id, roomId));

    return NextResponse.json({ removed: true, charged });
  } catch (error: any) {
    console.error('Error removing participant:', error);
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
  }
}
