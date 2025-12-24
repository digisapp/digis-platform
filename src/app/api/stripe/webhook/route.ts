import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { WalletService } from '@/lib/wallet/wallet-service';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { sendCoinPurchaseEmail } from '@/lib/email/payout-notifications';
import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';

// Force Node.js runtime for crypto operations
export const runtime = 'nodejs';

// Disable body parsing - we need raw body for signature verification
export const dynamic = 'force-dynamic';

/**
 * Stripe Webhook Handler with Strong Verification
 *
 * Security measures:
 * 1. Signature verification using STRIPE_WEBHOOK_SECRET
 * 2. Timestamp validation (rejects events older than 5 minutes)
 * 3. Event type allowlist (only process expected events)
 * 4. Idempotency via Inngest (prevents double-processing)
 */

// Allowlist of event types we handle - reject everything else
const ALLOWED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

// Maximum age of webhook events we'll accept (5 minutes)
const MAX_WEBHOOK_AGE_SECONDS = 300;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Validate signature header exists
  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Validate webhook secret is configured
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
    Sentry.captureMessage('Stripe webhook secret not configured', 'error');
    return NextResponse.json(
      { error: 'Webhook configuration error' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature with tolerance for clock skew
    // constructEvent throws if signature is invalid
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Stripe Webhook] Signature verification failed:', errorMessage);

    // Log to Sentry for security monitoring
    Sentry.captureException(error, {
      tags: { security: 'webhook_signature_failed' },
      extra: { signature_header: signature?.substring(0, 20) + '...' },
    });

    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Validate event timestamp (prevent replay attacks)
  const eventAge = Math.floor(Date.now() / 1000) - event.created;
  if (eventAge > MAX_WEBHOOK_AGE_SECONDS) {
    console.error(`[Stripe Webhook] Event too old: ${eventAge}s (max ${MAX_WEBHOOK_AGE_SECONDS}s)`);
    Sentry.captureMessage('Stripe webhook event too old (possible replay)', {
      level: 'warning',
      extra: { event_id: event.id, event_age: eventAge },
    });
    return NextResponse.json(
      { error: 'Event too old' },
      { status: 400 }
    );
  }

  // Validate event type is in allowlist
  if (!ALLOWED_EVENT_TYPES.has(event.type)) {
    // Not an error - just an event type we don't handle
    console.log(`[Stripe Webhook] Ignoring unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true, ignored: true });
  }

  console.log(`[Stripe Webhook] Processing event: ${event.type} (${event.id})`)

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Validate session metadata
        if (!session.metadata?.userId || !session.metadata?.coins) {
          console.error('[Stripe Webhook] Invalid session metadata:', session.id);
          break;
        }

        if (session.payment_status !== 'paid') {
          console.error('[Stripe Webhook] Payment not completed:', session.id);
          break;
        }

        const userId = session.metadata.userId;
        const coins = parseInt(session.metadata.coins);
        const packageId = session.metadata.packageId;

        console.log(`[Stripe Webhook] Processing coin purchase: ${coins} coins for user ${userId}`);

        // Credit user's wallet directly (with idempotency)
        try {
          const transaction = await WalletService.createTransaction({
            userId,
            amount: coins,
            type: 'purchase',
            description: `Purchased ${coins} coins`,
            metadata: {
              stripeSessionId: session.id,
              packageId,
            },
            idempotencyKey: `stripe_${session.id}`,
          });

          console.log(`[Stripe Webhook] Wallet credited successfully: ${transaction.id}`);

          // Send confirmation email
          try {
            const user = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });

            if (user?.email) {
              const amountPaid = session.amount_total
                ? `$${(session.amount_total / 100).toFixed(2)}`
                : 'N/A';

              await sendCoinPurchaseEmail(
                user.email,
                user.displayName || user.username || 'User',
                coins,
                amountPaid
              );
              console.log(`[Stripe Webhook] Confirmation email sent to ${user.email}`);
            }
          } catch (emailError) {
            console.error('[Stripe Webhook] Failed to send confirmation email:', emailError);
            // Don't fail the webhook for email errors
          }
        } catch (walletError) {
          console.error('[Stripe Webhook] Failed to credit wallet:', walletError);
          Sentry.captureException(walletError, {
            tags: { payment: 'wallet_credit_failed' },
            extra: { userId, coins, sessionId: session.id },
          });
          // Return 500 so Stripe will retry
          return NextResponse.json(
            { error: 'Failed to credit wallet' },
            { status: 500 }
          );
        }

        console.log(`[Stripe Webhook] Checkout completed: ${session.id}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error(`PaymentIntent failed: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
