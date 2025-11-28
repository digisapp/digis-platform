import { inngest } from './client';
import { WalletService } from '@/lib/wallet/wallet-service';
import { sendCoinPurchaseEmail } from '@/lib/email/payout-notifications';
import { db } from '@/lib/data/system';
import { wallets, walletTransactions, users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';

// Process successful Stripe payments
export const processStripePayment = inngest.createFunction(
  {
    id: 'process-stripe-payment',
    retries: 3,
  },
  { event: 'stripe/checkout.completed' },
  async ({ event, step }) => {
    const session = event.data.session as Stripe.Checkout.Session;

    // Step 1: Validate session
    const validation = await step.run('validate-session', async () => {
      if (!session.metadata?.userId || !session.metadata?.coins) {
        throw new Error('Invalid session metadata');
      }

      if (session.payment_status !== 'paid') {
        throw new Error('Payment not completed');
      }

      return {
        userId: session.metadata.userId,
        coins: parseInt(session.metadata.coins),
        packageId: session.metadata.packageId,
        sessionId: session.id,
      };
    });

    // Step 2: Credit user's wallet (with idempotency)
    const transaction = await step.run('credit-wallet', async () => {
      return await WalletService.createTransaction({
        userId: validation.userId,
        amount: validation.coins,
        type: 'purchase',
        description: `Purchased ${validation.coins} coins`,
        metadata: {
          stripeSessionId: validation.sessionId,
          packageId: validation.packageId,
        },
        idempotencyKey: `stripe_${validation.sessionId}`,
      });
    });

    // Step 3: Send confirmation email
    await step.run('send-confirmation', async () => {
      // Get user info for email
      const user = await db.query.users.findFirst({
        where: eq(users.id, validation.userId),
      });

      if (user?.email) {
        const amountPaid = session.amount_total
          ? `$${(session.amount_total / 100).toFixed(2)}`
          : 'N/A';

        await sendCoinPurchaseEmail(
          user.email,
          user.displayName || 'there',
          validation.coins,
          amountPaid
        );
      }

      console.log(`User ${validation.userId} purchased ${validation.coins} coins`);
      return { sent: true };
    });

    return {
      success: true,
      transactionId: transaction.id,
      coins: validation.coins,
    };
  }
);

// Reconcile wallet balances (nightly job)
export const reconcileWallets = inngest.createFunction(
  {
    id: 'reconcile-wallets',
  },
  { cron: '0 2 * * *' }, // Run at 2 AM daily
  async ({ step }) => {
    // Step 1: Get all wallets with their stored balances
    const walletsToCheck = await step.run('get-wallets', async () => {
      const allWallets = await db.query.wallets.findMany({
        columns: {
          id: true,
          userId: true,
          balance: true,
        },
      });
      return allWallets;
    });

    // Step 2: Check each wallet's calculated balance vs stored balance
    const discrepancies = await step.run('check-balances', async () => {
      const issues: Array<{
        walletId: string;
        userId: string;
        storedBalance: number;
        calculatedBalance: number;
        difference: number;
      }> = [];

      for (const wallet of walletsToCheck) {
        // Calculate balance from transactions
        const result = await db
          .select({
            total: sql<number>`COALESCE(SUM(amount), 0)`,
          })
          .from(walletTransactions)
          .where(eq(walletTransactions.userId, wallet.userId));

        const calculatedBalance = Number(result[0]?.total || 0);
        const storedBalance = wallet.balance;

        // Check for discrepancy (allow for small rounding differences)
        if (Math.abs(calculatedBalance - storedBalance) > 0) {
          issues.push({
            walletId: wallet.id,
            userId: wallet.userId,
            storedBalance,
            calculatedBalance,
            difference: calculatedBalance - storedBalance,
          });
        }
      }

      return issues;
    });

    // Step 3: Auto-fix discrepancies by updating stored balance to match calculated
    const fixes = await step.run('fix-discrepancies', async () => {
      const fixed: string[] = [];

      for (const issue of discrepancies) {
        // Update wallet balance to match calculated (transaction sum is source of truth)
        await db
          .update(wallets)
          .set({
            balance: issue.calculatedBalance,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, issue.walletId));

        fixed.push(issue.userId);

        console.log(
          `[Reconciliation] Fixed wallet for user ${issue.userId}: ` +
          `${issue.storedBalance} -> ${issue.calculatedBalance} (diff: ${issue.difference})`
        );
      }

      return fixed;
    });

    // Log summary
    console.log(`[Reconciliation] Completed. Checked ${walletsToCheck.length} wallets, fixed ${fixes.length} discrepancies.`);

    return {
      status: 'completed',
      walletsChecked: walletsToCheck.length,
      discrepanciesFound: discrepancies.length,
      fixed: fixes.length,
    };
  }
);
