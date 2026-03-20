import { NextResponse } from 'next/server';
import { AdminInboxService } from '@/lib/email/admin-inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Resend inbound webhook — receives emails sent to admin@digis.cc
// Resend webhook docs: https://resend.com/docs/dashboard/webhooks/introduction

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify webhook secret via header (Resend sends svix headers)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      // Resend uses Svix — check the svix-id header exists as basic verification
      // For production, install svix package for full signature verification
      const svixId = request.headers.get('svix-id');
      const svixTimestamp = request.headers.get('svix-timestamp');
      const svixSignature = request.headers.get('svix-signature');

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('[Resend Inbound] Missing svix verification headers');
        return NextResponse.json({ error: 'Missing verification headers' }, { status: 401 });
      }

      // Timestamp validation — reject if older than 5 minutes
      const timestamp = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        console.warn('[Resend Inbound] Webhook timestamp too old');
        return NextResponse.json({ error: 'Timestamp expired' }, { status: 401 });
      }
    }

    // Handle different Resend webhook event types
    const eventType = body.type;

    if (eventType === 'email.received') {
      const data = body.data;

      // Extract email fields from Resend inbound payload
      const from = data.from?.[0]?.email || data.from || '';
      const fromName = data.from?.[0]?.name || '';
      const to = data.to?.[0]?.email || data.to || '';
      const subject = data.subject || '(No Subject)';
      const text = data.text || '';
      const html = data.html || '';

      // Extract threading headers
      const headers = data.headers || {};
      const messageId = headers['message-id'] || data.message_id || '';
      const inReplyTo = headers['in-reply-to'] || '';

      console.log(`[Resend Inbound] Email received from ${from}: ${subject}`);

      await AdminInboxService.storeInboundEmail({
        from,
        fromName,
        to,
        subject,
        text,
        html,
        messageId,
        inReplyToHeader: inReplyTo || undefined,
      });

      return NextResponse.json({ received: true });
    }

    // For other event types (email.sent, email.delivered, etc.), just acknowledge
    console.log(`[Resend Webhook] Event: ${eventType}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Resend Inbound] Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
