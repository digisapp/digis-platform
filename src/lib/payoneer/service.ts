/**
 * Payoneer Service
 *
 * Business logic for Payoneer operations: registration, payouts, status sync
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import {
  creatorPayoneerInfo,
  payoutRequests,
  wallets,
  walletTransactions,
  spendHolds,
} from '@/db/schema';
import { payoneerClient } from './client';
import { sql } from 'drizzle-orm';

const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

export interface RegistrationResult {
  success: boolean;
  registrationLink?: string;
  expiresAt?: Date;
  error?: string;
}

export interface PayoutResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  error?: string;
}

export interface PayeeStatusResult {
  status: 'not_registered' | 'pending' | 'active' | 'inactive' | 'declined';
  payeeId?: string;
  preferredCurrency?: string;
  lastSyncedAt?: Date;
}

/**
 * Generate a registration link for a creator to connect their Payoneer account
 */
export async function generateRegistrationLink(creatorId: string): Promise<RegistrationResult> {
  try {
    // Check if creator already has a Payoneer account
    let payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
      where: eq(creatorPayoneerInfo.creatorId, creatorId),
    });

    // If already active, no need for registration
    if (payoneerInfo?.payeeStatus === 'active') {
      return {
        success: false,
        error: 'Payoneer account is already connected',
      };
    }

    // Generate registration link from Payoneer
    const redirectUrl = `${NEXT_PUBLIC_URL}/creator/earnings?payoneer=connected`;
    const response = await payoneerClient.generateRegistrationLink({
      payeeId: creatorId,
      redirectUrl,
      redirectTime: 5,
    });

    const expiresAt = response.expires_at ? new Date(response.expires_at) : undefined;

    // Create or update the Payoneer info record
    if (payoneerInfo) {
      await db
        .update(creatorPayoneerInfo)
        .set({
          registrationLink: response.registration_link,
          registrationLinkExpiresAt: expiresAt,
          payeeStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(creatorPayoneerInfo.creatorId, creatorId));
    } else {
      await db.insert(creatorPayoneerInfo).values({
        creatorId,
        payeeId: creatorId, // Using creatorId as payeeId for Payoneer
        payeeStatus: 'pending',
        registrationLink: response.registration_link,
        registrationLinkExpiresAt: expiresAt,
      });
    }

    return {
      success: true,
      registrationLink: response.registration_link,
      expiresAt,
    };
  } catch (error) {
    console.error('Error generating Payoneer registration link:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate registration link',
    };
  }
}

/**
 * Sync payee status from Payoneer API
 */
export async function syncPayeeStatus(creatorId: string): Promise<PayeeStatusResult> {
  try {
    // Get current local record
    const payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
      where: eq(creatorPayoneerInfo.creatorId, creatorId),
    });

    if (!payoneerInfo) {
      return { status: 'not_registered' };
    }

    // Fetch status from Payoneer API
    const response = await payoneerClient.getPayeeStatus(creatorId);

    // Map Payoneer status to our enum
    let status: PayeeStatusResult['status'] = 'not_registered';
    switch (response.status?.toLowerCase()) {
      case 'active':
        status = 'active';
        break;
      case 'pending':
      case 'in_progress':
        status = 'pending';
        break;
      case 'inactive':
      case 'suspended':
        status = 'inactive';
        break;
      case 'declined':
      case 'rejected':
        status = 'declined';
        break;
      default:
        status = payoneerInfo.payeeStatus;
    }

    // Update local record
    await db
      .update(creatorPayoneerInfo)
      .set({
        payeeStatus: status,
        payeeId: response.payee_id,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
        metadata: JSON.stringify({
          payout_methods: response.payout_methods,
          contact: response.contact,
        }),
      })
      .where(eq(creatorPayoneerInfo.creatorId, creatorId));

    return {
      status,
      payeeId: response.payee_id,
      preferredCurrency: payoneerInfo.preferredCurrency || 'USD',
      lastSyncedAt: new Date(),
    };
  } catch (error) {
    console.error('Error syncing Payoneer payee status:', error);

    // Return cached status if API fails
    const payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
      where: eq(creatorPayoneerInfo.creatorId, creatorId),
    });

    return {
      status: payoneerInfo?.payeeStatus || 'not_registered',
      payeeId: payoneerInfo?.payeeId || undefined,
      lastSyncedAt: payoneerInfo?.lastSyncedAt || undefined,
    };
  }
}

/**
 * Get the current Payoneer status for a creator (from local DB, optionally sync)
 */
export async function getPayoneerStatus(
  creatorId: string,
  forceSync: boolean = false
): Promise<PayeeStatusResult> {
  const payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
    where: eq(creatorPayoneerInfo.creatorId, creatorId),
  });

  if (!payoneerInfo) {
    return { status: 'not_registered' };
  }

  // If force sync or last sync was more than 5 minutes ago, sync with API
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const shouldSync = forceSync ||
    !payoneerInfo.lastSyncedAt ||
    payoneerInfo.lastSyncedAt < fiveMinutesAgo;

  if (shouldSync && payoneerInfo.payeeStatus !== 'active') {
    return syncPayeeStatus(creatorId);
  }

  return {
    status: payoneerInfo.payeeStatus,
    payeeId: payoneerInfo.payeeId || undefined,
    preferredCurrency: payoneerInfo.preferredCurrency || 'USD',
    lastSyncedAt: payoneerInfo.lastSyncedAt || undefined,
  };
}

/**
 * Submit a payout request to Payoneer
 */
export async function submitPayout(payoutRequestId: string): Promise<PayoutResult> {
  try {
    // Get the payout request with creator info
    const payout = await db.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, payoutRequestId),
    });

    if (!payout) {
      return { success: false, error: 'Payout request not found' };
    }

    if (payout.payoutMethod !== 'payoneer') {
      return { success: false, error: 'This payout is not configured for Payoneer' };
    }

    if (payout.status !== 'pending' && payout.status !== 'processing') {
      return { success: false, error: `Invalid payout status: ${payout.status}` };
    }

    // Get Payoneer info for the creator
    const payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
      where: eq(creatorPayoneerInfo.creatorId, payout.creatorId),
    });

    if (!payoneerInfo || payoneerInfo.payeeStatus !== 'active') {
      return { success: false, error: 'Creator does not have an active Payoneer account' };
    }

    // Convert coins to USD (10 coins = $1, so multiply by 0.10)
    const amountUSD = payout.amount * 0.10;

    // Generate unique external reference
    const externalReference = `payout_${payoutRequestId}_${Date.now()}`;

    // Submit to Payoneer
    const response = await payoneerClient.submitPayout({
      payee_id: payout.creatorId,
      amount: amountUSD,
      currency: payoneerInfo.preferredCurrency || 'USD',
      description: `Creator payout - ${payout.amount} coins`,
      client_reference_id: externalReference,
    });

    // Update payout request with Payoneer details
    await db
      .update(payoutRequests)
      .set({
        status: 'processing',
        payoneerPaymentId: response.payment_id,
        externalReference,
        providerStatus: response.status,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payoutRequests.id, payoutRequestId));

    return {
      success: true,
      paymentId: response.payment_id,
      status: response.status,
    };
  } catch (error) {
    console.error('Error submitting Payoneer payout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit payout',
    };
  }
}

/**
 * Check and update payout status from Payoneer
 */
export async function checkPayoutStatus(payoutRequestId: string): Promise<PayoutResult> {
  try {
    const payout = await db.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, payoutRequestId),
    });

    if (!payout || !payout.payoneerPaymentId) {
      return { success: false, error: 'Payout not found or not submitted to Payoneer' };
    }

    const response = await payoneerClient.getPaymentStatus(payout.payoneerPaymentId);

    // Update local status
    const updates: Partial<typeof payoutRequests.$inferSelect> = {
      providerStatus: response.status,
      updatedAt: new Date(),
    };

    // Map Payoneer status to our status
    if (response.status === 'completed') {
      updates.status = 'completed';
      updates.completedAt = new Date();
    } else if (response.status === 'failed' || response.status === 'rejected') {
      updates.status = 'failed';
      updates.failureReason = response.failure_reason || 'Payment failed at provider';
    } else if (response.status === 'cancelled') {
      updates.status = 'cancelled';
    }

    await db
      .update(payoutRequests)
      .set(updates)
      .where(eq(payoutRequests.id, payoutRequestId));

    return {
      success: true,
      paymentId: payout.payoneerPaymentId,
      status: response.status,
    };
  } catch (error) {
    console.error('Error checking Payoneer payout status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check payout status',
    };
  }
}

/**
 * Handle payee status update from webhook
 */
export async function handlePayeeStatusWebhook(
  payeeId: string,
  newStatus: string
): Promise<void> {
  // Map Payoneer status to our enum
  let status: 'not_registered' | 'pending' | 'active' | 'inactive' | 'declined' = 'pending';
  switch (newStatus.toLowerCase()) {
    case 'active':
      status = 'active';
      break;
    case 'pending':
    case 'in_progress':
      status = 'pending';
      break;
    case 'inactive':
    case 'suspended':
      status = 'inactive';
      break;
    case 'declined':
    case 'rejected':
      status = 'declined';
      break;
  }

  await db
    .update(creatorPayoneerInfo)
    .set({
      payeeStatus: status,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(creatorPayoneerInfo.creatorId, payeeId));

  console.log(`Updated payee ${payeeId} status to ${status}`);
}

/**
 * Handle payment status update from webhook
 */
export async function handlePaymentStatusWebhook(
  paymentId: string,
  newStatus: string,
  failureReason?: string
): Promise<void> {
  // Find the payout request by Payoneer payment ID
  const payout = await db.query.payoutRequests.findFirst({
    where: eq(payoutRequests.payoneerPaymentId, paymentId),
  });

  if (!payout) {
    console.error(`Payout not found for payment ID: ${paymentId}`);
    return;
  }

  const updates: Partial<typeof payoutRequests.$inferSelect> = {
    providerStatus: newStatus,
    updatedAt: new Date(),
  };

  // Map status and handle completion/failure
  if (newStatus === 'completed') {
    updates.status = 'completed';
    updates.completedAt = new Date();

    // Finalize the payout: deduct from wallet and settle the hold
    await finalizeCompletedPayout(payout.id, payout.creatorId, payout.amount);
  } else if (newStatus === 'failed' || newStatus === 'rejected') {
    updates.status = 'failed';
    updates.failureReason = failureReason || 'Payment failed at provider';

    // Release the hold back to the creator
    await releasePayoutHold(payout.id, payout.creatorId, payout.amount);
  } else if (newStatus === 'cancelled') {
    updates.status = 'cancelled';

    // Release the hold back to the creator
    await releasePayoutHold(payout.id, payout.creatorId, payout.amount);
  }

  await db
    .update(payoutRequests)
    .set(updates)
    .where(eq(payoutRequests.id, payout.id));

  console.log(`Updated payment ${paymentId} status to ${newStatus}`);
}

/**
 * Finalize a completed payout: deduct balance and record transaction
 */
async function finalizeCompletedPayout(
  payoutId: string,
  creatorId: string,
  amount: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Get the hold from metadata
    const payout = await tx.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, payoutId),
    });

    if (!payout?.metadata) return;

    const metadata = JSON.parse(payout.metadata);
    const holdId = metadata.holdId;

    if (holdId) {
      // Settle the hold
      await tx
        .update(spendHolds)
        .set({
          status: 'settled',
          settledAt: new Date(),
        })
        .where(eq(spendHolds.id, holdId));
    }

    // Deduct from wallet balance and held balance
    await tx
      .update(wallets)
      .set({
        balance: sql`${wallets.balance} - ${amount}`,
        heldBalance: sql`${wallets.heldBalance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, creatorId));

    // Record the transaction
    await tx.insert(walletTransactions).values({
      userId: creatorId,
      amount: -amount,
      type: 'creator_payout',
      status: 'completed',
      description: `Payout via Payoneer`,
      metadata: JSON.stringify({ payoutId, method: 'payoneer' }),
    });

    // Link transaction to payout
    const [transaction] = await tx.query.walletTransactions.findMany({
      where: and(
        eq(walletTransactions.userId, creatorId),
        eq(walletTransactions.type, 'creator_payout')
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 1,
    });

    if (transaction) {
      await tx
        .update(payoutRequests)
        .set({ transactionId: transaction.id })
        .where(eq(payoutRequests.id, payoutId));
    }
  });
}

/**
 * Release a hold when payout fails or is cancelled
 */
async function releasePayoutHold(
  payoutId: string,
  creatorId: string,
  amount: number
): Promise<void> {
  await db.transaction(async (tx) => {
    // Get the hold from metadata
    const payout = await tx.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, payoutId),
    });

    if (!payout?.metadata) return;

    const metadata = JSON.parse(payout.metadata);
    const holdId = metadata.holdId;

    if (holdId) {
      // Release the hold
      await tx
        .update(spendHolds)
        .set({
          status: 'released',
          releasedAt: new Date(),
        })
        .where(eq(spendHolds.id, holdId));
    }

    // Release from held balance (balance stays the same)
    await tx
      .update(wallets)
      .set({
        heldBalance: sql`${wallets.heldBalance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, creatorId));
  });
}

/**
 * Check if Payoneer is available for a creator
 */
export async function isPayoneerAvailable(creatorId: string): Promise<boolean> {
  const payoneerInfo = await db.query.creatorPayoneerInfo.findFirst({
    where: eq(creatorPayoneerInfo.creatorId, creatorId),
  });

  return payoneerInfo?.payeeStatus === 'active';
}

/**
 * Check if Payoneer is configured on the platform
 */
export function isPayoneerConfigured(): boolean {
  return payoneerClient.isConfigured();
}
