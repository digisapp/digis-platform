import { inngest } from './client';
import { WalletService } from '@/lib/wallet/wallet-service';
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

    // Step 3: Send confirmation (optional - could be email)
    await step.run('send-confirmation', async () => {
      console.log(`User ${validation.userId} purchased ${validation.coins} coins`);
      // TODO: Send confirmation email
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
    // This would batch process all users
    // For now, we'll just log that it ran
    await step.run('reconcile', async () => {
      console.log('Running wallet reconciliation...');
      // TODO: Implement batch reconciliation
      return { status: 'completed' };
    });
  }
);
