import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms, groupRoomParticipants, wallets, walletTransactions, spendHolds } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms/[roomId]/leave
 * Leave a group room (settles per-minute hold if applicable)
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

    const participant = await db.query.groupRoomParticipants.findFirst({
      where: and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.userId, user.id),
        eq(groupRoomParticipants.status, 'joined'),
      ),
    });

    if (!participant) {
      return NextResponse.json({ error: 'Not in this room' }, { status: 400 });
    }

    const room = await db.query.groupRooms.findFirst({
      where: eq(groupRooms.id, roomId),
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - participant.joinedAt.getTime()) / 1000);

    // Handle per-minute billing
    let charged = 0;
    if (room.priceType === 'per_minute' && participant.holdId) {
      const durationMinutes = Math.ceil(durationSeconds / 60);
      charged = room.priceCoins * durationMinutes;

      await db.transaction(async (tx) => {
        // Settle hold
        const [hold] = await tx
          .select()
          .from(spendHolds)
          .where(eq(spendHolds.id, participant.holdId!))
          .for('update');

        if (hold && hold.status === 'active') {
          // Cap charge to hold amount
          const actualCharge = Math.min(charged, hold.amount);

          // Debit fan
          const [debitTx] = await tx
            .insert(walletTransactions)
            .values({
              userId: user.id,
              amount: -actualCharge,
              type: 'group_room_payment',
              status: 'completed',
              description: `Group room: ${room.title} (${durationMinutes} min)`,
              idempotencyKey: `group-leave-${user.id}-${roomId}-${participant.id}`,
            })
            .returning();

          // Credit creator
          await tx
            .insert(walletTransactions)
            .values({
              userId: room.creatorId,
              amount: actualCharge,
              type: 'group_room_earnings',
              status: 'completed',
              description: `Group room earnings: ${room.title}`,
              idempotencyKey: `group-leave-earn-${room.creatorId}-${user.id}-${roomId}`,
              relatedTransactionId: debitTx.id,
            });

          // Update wallets
          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} - ${actualCharge}`,
              heldBalance: sql`${wallets.heldBalance} - ${hold.amount}`,
              updatedAt: now,
            })
            .where(eq(wallets.userId, user.id));

          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} + ${actualCharge}`,
              updatedAt: now,
            })
            .where(eq(wallets.userId, room.creatorId));

          // Settle hold
          await tx
            .update(spendHolds)
            .set({ status: 'settled', settledAt: now })
            .where(eq(spendHolds.id, hold.id));

          charged = actualCharge;
        }
      });
    }

    // Update participant
    await db
      .update(groupRoomParticipants)
      .set({
        status: 'left',
        leftAt: now,
        durationSeconds,
        coinsCharged: charged || participant.coinsCharged,
      })
      .where(eq(groupRoomParticipants.id, participant.id));

    // Decrement current participants
    await db
      .update(groupRooms)
      .set({
        currentParticipants: sql`GREATEST(${groupRooms.currentParticipants} - 1, 0)`,
        totalEarnings: charged > 0
          ? sql`${groupRooms.totalEarnings} + ${charged}`
          : groupRooms.totalEarnings,
        updatedAt: now,
      })
      .where(eq(groupRooms.id, roomId));

    return NextResponse.json({ left: true, durationSeconds, charged });
  } catch (error: any) {
    console.error('Error leaving group room:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to leave room' },
      { status: 500 }
    );
  }
}
