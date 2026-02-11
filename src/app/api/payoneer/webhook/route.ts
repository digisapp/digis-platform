import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { payoneerClient } from '@/lib/payoneer/client';
import {
  handlePayeeStatusWebhook,
  handlePaymentStatusWebhook,
} from '@/lib/payoneer/service';
import { WebhookEvent } from '@/lib/payoneer/types';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/payoneer/webhook
 *
 * Handles incoming webhook events from Payoneer:
 * - payee_status_changed: Creator completed/failed Payoneer registration
 * - payment_status_changed: Payout completed/failed
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Get signature from headers
    const signature = request.headers.get('x-payoneer-signature') ||
                      request.headers.get('x-webhook-signature') || '';

    // Verify webhook signature
    if (!payoneerClient.verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid Payoneer webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the event
    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error('Invalid JSON in Payoneer webhook');
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    console.log(`Received Payoneer webhook: ${event.event_type}`, {
      payeeId: event.data?.payee_id,
      paymentId: event.data?.payment_id,
      status: event.data?.status,
    });

    // Handle different event types
    switch (event.event_type) {
      case 'payee_status_changed': {
        const payeeId = event.data?.payee_id;
        const newStatus = event.data?.status;

        if (!payeeId || !newStatus) {
          return NextResponse.json(
            { error: 'Missing payee_id or status' },
            { status: 400 }
          );
        }

        await handlePayeeStatusWebhook(payeeId, newStatus);
        break;
      }

      case 'payment_status_changed':
      case 'payout_completed':
      case 'payout_failed': {
        const paymentId = event.data?.payment_id;
        const newStatus = event.data?.status;

        if (!paymentId || !newStatus) {
          return NextResponse.json(
            { error: 'Missing payment_id or status' },
            { status: 400 }
          );
        }

        await handlePaymentStatusWebhook(
          paymentId,
          newStatus,
          event.data?.failure_reason
        );
        break;
      }

      default:
        console.log(`Unhandled Payoneer webhook event type: ${event.event_type}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Payoneer webhook:', error);
    Sentry.captureException(error, { tags: { webhook: 'payoneer' } });
    // Return 200 to prevent Payoneer from retrying on our errors
    // Log the error for investigation
    return NextResponse.json({ received: true, error: 'Internal processing error' });
  }
}

// Mock webhook endpoint for development testing
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('event') || 'payee_status_changed';
  const payeeId = searchParams.get('payee_id');
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status') || 'active';

  if (eventType === 'payee_status_changed' && payeeId) {
    await handlePayeeStatusWebhook(payeeId, status);
    return NextResponse.json({ success: true, message: `Payee ${payeeId} status updated to ${status}` });
  }

  if ((eventType === 'payment_status_changed' || eventType === 'payout_completed') && paymentId) {
    await handlePaymentStatusWebhook(paymentId, status);
    return NextResponse.json({ success: true, message: `Payment ${paymentId} status updated to ${status}` });
  }

  return NextResponse.json({
    message: 'Mock webhook endpoint. Use query params: ?event=payee_status_changed&payee_id=xxx&status=active',
    availableEvents: ['payee_status_changed', 'payment_status_changed', 'payout_completed', 'payout_failed'],
    availableStatuses: {
      payee: ['not_registered', 'pending', 'active', 'inactive', 'declined'],
      payment: ['pending', 'in_progress', 'completed', 'failed', 'rejected', 'cancelled'],
    },
  });
}
