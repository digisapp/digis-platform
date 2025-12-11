import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, payoutRequests, wallets, walletTransactions, users } from '@/lib/data/system';
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

    // Get the payout request
    const payout = await db.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, payoutId),
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    // Use transaction for status updates that affect balance
    await db.transaction(async (tx) => {
      const updateData: any = {
        status,
        adminNotes,
        updatedAt: new Date(),
      };

      // Handle different status transitions
      if (status === 'processing') {
        updateData.processedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();

        // Deduct coins from creator's wallet
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${payout.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, payout.creatorId));

        // Create transaction record
        await tx.insert(walletTransactions).values({
          userId: payout.creatorId,
          amount: -payout.amount,
          type: 'creator_payout',
          status: 'completed',
          description: `Payout completed: ${payout.amount} coins`,
          metadata: JSON.stringify({ payoutId }),
        });

        // Link transaction ID to payout
        const [transaction] = await tx
          .select()
          .from(walletTransactions)
          .where(eq(walletTransactions.userId, payout.creatorId))
          .orderBy(sql`created_at DESC`)
          .limit(1);

        if (transaction) {
          updateData.transactionId = transaction.id;
        }
      } else if (status === 'failed' || status === 'cancelled') {
        updateData.failureReason = failureReason;
        // Coins remain in wallet for failed/cancelled payouts
      }

      // Update payout request
      await tx
        .update(payoutRequests)
        .set(updateData)
        .where(eq(payoutRequests.id, payoutId));
    });

    // Send email notification based on status
    try {
      const creator = await db.query.users.findFirst({
        where: eq(users.id, payout.creatorId),
      });

      if (creator && creator.email) {
        const emailData = {
          creatorEmail: creator.email,
          creatorName: creator.displayName || creator.username || 'Creator',
          amount: payout.amount,
          status: status as any,
          requestedAt: new Date(payout.requestedAt),
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
