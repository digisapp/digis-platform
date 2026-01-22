import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests, wallets, walletTransactions, users, spendHolds } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import {
  sendPayoutProcessingEmail,
  sendPayoutCompletedEmail,
  sendPayoutFailedEmail,
} from '@/lib/email/payout-notifications';
import { isAdminUser } from '@/lib/admin/check-admin';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/payouts/update - Update payout status (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { payoutId, status, adminNotes, failureReason } = await request.json();

    if (!payoutId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Valid status transitions
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Use transaction with row-level locking to prevent concurrent approval issues
    // This ensures only one admin can update a payout at a time
    const result = await db.transaction(async (tx) => {
      // Lock the payout row to prevent concurrent updates
      const lockedPayoutResult = await tx.execute(
        sql`SELECT * FROM payout_requests WHERE id = ${payoutId} FOR UPDATE`
      );

      // Drizzle execute returns array directly
      const payoutRows = lockedPayoutResult as unknown as Array<{
        id: string;
        creator_id: string;
        amount: number;
        status: string;
        requested_at: Date;
        metadata: string | null;
      }>;
      const payout = payoutRows[0];

      // Parse hold ID from metadata (if exists)
      let holdId: string | null = null;
      if (payout?.metadata) {
        try {
          const meta = JSON.parse(payout.metadata);
          holdId = meta.holdId || null;
        } catch {
          // Metadata parsing failed, continue without hold
        }
      }

      if (!payout) {
        throw new Error('Payout not found');
      }

      // Prevent processing if already in a terminal state
      if (payout.status === 'completed' && status === 'completed') {
        throw new Error('Payout already completed');
      }
      if (payout.status === 'failed' && status === 'failed') {
        throw new Error('Payout already failed');
      }
      if (payout.status === 'cancelled' && status === 'cancelled') {
        throw new Error('Payout already cancelled');
      }

      const updateData: Record<string, any> = {
        status,
        adminNotes,
        updatedAt: new Date(),
      };

      // Handle different status transitions
      if (status === 'processing') {
        updateData.processedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();

        // Idempotency key prevents double-deduction if this somehow runs twice
        const idempotencyKey = `payout_complete_${payoutId}`;

        // Check if already processed (idempotency)
        const existingTx = await tx.query.walletTransactions.findFirst({
          where: eq(walletTransactions.idempotencyKey, idempotencyKey),
        });

        if (existingTx) {
          console.log('Payout completion already processed (idempotent):', payoutId);
          updateData.transactionId = existingTx.id;
        } else {
          // Lock the wallet row to prevent race conditions
          await tx.execute(
            sql`SELECT * FROM wallets WHERE user_id = ${payout.creator_id} FOR UPDATE`
          );

          // Settle the hold: release heldBalance and deduct from balance
          // The hold reserved the amount, now we're completing the payout
          if (holdId) {
            await tx
              .update(spendHolds)
              .set({
                status: 'settled',
                settledAt: new Date(),
              })
              .where(eq(spendHolds.id, holdId));

            // Release the held balance (it was reserved for this payout)
            await tx
              .update(wallets)
              .set({
                heldBalance: sql`GREATEST(0, ${wallets.heldBalance} - ${payout.amount})`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, payout.creator_id));
          }

          // Deduct coins from creator's wallet
          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} - ${payout.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, payout.creator_id));

          // Create transaction record with idempotency key
          const [transaction] = await tx.insert(walletTransactions).values({
            userId: payout.creator_id,
            amount: -payout.amount,
            type: 'creator_payout',
            status: 'completed',
            description: `Payout completed: ${payout.amount} coins`,
            metadata: JSON.stringify({ payoutId }),
            idempotencyKey,
          }).returning();

          updateData.transactionId = transaction.id;
        }
      } else if (status === 'failed' || status === 'cancelled') {
        updateData.failureReason = failureReason;

        // Lock the wallet row for any balance operations
        await tx.execute(
          sql`SELECT * FROM wallets WHERE user_id = ${payout.creator_id} FOR UPDATE`
        );

        // If payout was previously 'completed', refund the coins
        if (payout.status === 'completed') {
          // Refund coins to creator's wallet
          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} + ${payout.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, payout.creator_id));

          // Create refund transaction record
          await tx.insert(walletTransactions).values({
            userId: payout.creator_id,
            amount: payout.amount,
            type: 'payout_refund',
            status: 'completed',
            description: `Payout refunded: ${payout.amount} coins - ${failureReason || 'Payout failed'}`,
            metadata: JSON.stringify({ payoutId, reason: failureReason }),
            idempotencyKey: `payout_refund_${payoutId}`,
          });
        } else if (holdId && (payout.status === 'pending' || payout.status === 'processing')) {
          // Release the hold: coins go back to available balance (no deduction)
          await tx
            .update(spendHolds)
            .set({
              status: 'released',
              releasedAt: new Date(),
            })
            .where(eq(spendHolds.id, holdId));

          // Release the held balance back to available
          await tx
            .update(wallets)
            .set({
              heldBalance: sql`GREATEST(0, ${wallets.heldBalance} - ${payout.amount})`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, payout.creator_id));
        }
      }

      // Update payout request
      await tx
        .update(payoutRequests)
        .set(updateData)
        .where(eq(payoutRequests.id, payoutId));

      return { payout, updateData };
    });

    // Send email notification based on status
    try {
      const creator = await db.query.users.findFirst({
        where: eq(users.id, result.payout.creator_id),
      });

      if (creator && creator.email) {
        const emailData = {
          creatorEmail: creator.email,
          creatorName: creator.displayName || creator.username || 'Creator',
          amount: result.payout.amount,
          status: status as any,
          requestedAt: new Date(result.payout.requested_at),
          failureReason,
        };

        if (status === 'processing') {
          await sendPayoutProcessingEmail(emailData);
        } else if (status === 'completed') {
          await sendPayoutCompletedEmail(emailData);
        } else if (status === 'failed') {
          await sendPayoutFailedEmail(emailData);
        }
      }
    } catch (emailError) {
      console.error('Failed to send payout status email:', emailError);
      // Don't fail the update if email fails
    }

    return NextResponse.json({
      success: true,
      message: `Payout ${status} successfully`,
    });
  } catch (error: any) {
    console.error('Error updating payout:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payout' },
      { status: 500 }
    );
  }
}
