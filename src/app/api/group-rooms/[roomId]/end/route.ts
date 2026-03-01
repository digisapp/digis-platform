import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { groupRooms, groupRoomParticipants, wallets, walletTransactions, spendHolds } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { LiveKitService } from '@/lib/services/livekit-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/group-rooms/[roomId]/end
 * End room (creator only - settles all active per-minute holds)
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
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.status === 'ended') {
      return NextResponse.json({ room, alreadyEnded: true });
    }

    const now = new Date();
    const durationSeconds = room.actualStart
      ? Math.floor((now.getTime() - room.actualStart.getTime()) / 1000)
      : 0;

    // Get all active participants
    const activeParticipants = await db.query.groupRoomParticipants.findMany({
      where: and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.status, 'joined'),
      ),
    });

    let totalSettled = 0;

    // Settle per-minute holds for each active participant
    if (room.priceType === 'per_minute') {
      for (const participant of activeParticipants) {
        if (!participant.holdId) continue;

        const participantDuration = Math.floor(
          (now.getTime() - participant.joinedAt.getTime()) / 1000
        );
        const durationMinutes = Math.ceil(participantDuration / 60);
        const charge = room.priceCoins * durationMinutes;

        try {
          await db.transaction(async (tx) => {
            const [hold] = await tx
              .select()
              .from(spendHolds)
              .where(eq(spendHolds.id, participant.holdId!))
              .for('update');

            if (!hold || hold.status !== 'active') return;

            const actualCharge = Math.min(charge, hold.amount);

            const [debitTx] = await tx
              .insert(walletTransactions)
              .values({
                userId: participant.userId,
                amount: -actualCharge,
                type: 'group_room_payment',
                status: 'completed',
                description: `Group room: ${room.title} (${durationMinutes} min)`,
                idempotencyKey: `group-end-${participant.userId}-${roomId}-${participant.id}`,
              })
              .onConflictDoNothing()
              .returning();

            if (!debitTx) return; // Already settled

            await tx
              .insert(walletTransactions)
              .values({
                userId: room.creatorId,
                amount: actualCharge,
                type: 'group_room_earnings',
                status: 'completed',
                description: `Group room earnings: ${room.title}`,
                idempotencyKey: `group-end-earn-${room.creatorId}-${participant.userId}-${roomId}`,
                relatedTransactionId: debitTx.id,
              });

            await tx
              .update(wallets)
              .set({
                balance: sql`${wallets.balance} - ${actualCharge}`,
                heldBalance: sql`${wallets.heldBalance} - ${hold.amount}`,
                updatedAt: now,
              })
              .where(eq(wallets.userId, participant.userId));

            await tx
              .update(wallets)
              .set({
                balance: sql`${wallets.balance} + ${actualCharge}`,
                updatedAt: now,
              })
              .where(eq(wallets.userId, room.creatorId));

            await tx
              .update(spendHolds)
              .set({ status: 'settled', settledAt: now })
              .where(eq(spendHolds.id, hold.id));

            await tx
              .update(groupRoomParticipants)
              .set({
                coinsCharged: actualCharge,
                durationSeconds: participantDuration,
              })
              .where(eq(groupRoomParticipants.id, participant.id));

            totalSettled += actualCharge;
          });
        } catch (err) {
          console.error(`Error settling hold for participant ${participant.userId}:`, err);
        }
      }
    }

    // Mark all active participants as left
    await db
      .update(groupRoomParticipants)
      .set({ status: 'left', leftAt: now })
      .where(and(
        eq(groupRoomParticipants.roomId, roomId),
        eq(groupRoomParticipants.status, 'joined'),
      ));

    // End room
    const [updated] = await db
      .update(groupRooms)
      .set({
        status: 'ended',
        actualEnd: now,
        durationSeconds,
        currentParticipants: 0,
        totalEarnings: sql`${groupRooms.totalEarnings} + ${totalSettled}`,
        updatedAt: now,
      })
      .where(eq(groupRooms.id, roomId))
      .returning();

    // Clean up LiveKit room
    if (room.roomName) {
      LiveKitService.deleteRoom(room.roomName).catch(() => {});
    }

    return NextResponse.json({
      room: updated,
      settled: totalSettled,
      participantsEnded: activeParticipants.length,
    });
  } catch (error: any) {
    console.error('Error ending room:', error);
    return NextResponse.json(
      { error: 'Failed to end room' },
      { status: 500 }
    );
  }
}
