import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { inngest } from '@/lib/inngest/client';
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

        // Send to Inngest for reliable processing
        await inngest.send({
          name: 'stripe/checkout.completed',
          data: {
            session,
          },
        });

        console.log(`Checkout completed: ${session.id}`);
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
