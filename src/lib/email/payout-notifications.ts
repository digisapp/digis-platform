import { createClient } from '@/lib/supabase/server';
import { formatCoinsAsUSD } from '@/lib/stripe/config';

/**
 * Send email notification for payout events
 * Uses Supabase's built-in email functionality
 */

interface PayoutNotificationData {
  creatorEmail: string;
  creatorName: string;
  amount: number; // in coins
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  failureReason?: string;
}

/**
 * Send payout request confirmation email
 */
export async function sendPayoutRequestEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);

  const subject = '💰 Payout Request Received - Digis';
  const message = `
Hi ${data.creatorName},

We've received your payout request!

Amount: ${amountUSD} (${data.amount.toLocaleString()} coins)
Requested: ${data.requestedAt.toLocaleDateString()} at ${data.requestedAt.toLocaleTimeString()}

Your payout will be processed within 2-3 business days. We'll send you another email once it's completed.

Thank you for being part of Digis!

Best regards,
The Digis Team
  `.trim();

  return await sendEmail(data.creatorEmail, subject, message);
}

/**
 * Send payout processing started email
 */
export async function sendPayoutProcessingEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);

  const subject = '⏳ Your Payout is Being Processed - Digis';
  const message = `
Hi ${data.creatorName},

Good news! Your payout is now being processed.

Amount: ${amountUSD} (${data.amount.toLocaleString()} coins)

The funds should arrive in your bank account within 1-2 business days.

Thank you for your patience!

Best regards,
The Digis Team
  `.trim();

  return await sendEmail(data.creatorEmail, subject, message);
}

/**
 * Send payout completed email
 */
export async function sendPayoutCompletedEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);

  const subject = '✅ Payout Completed - Digis';
  const message = `
Hi ${data.creatorName},

Your payout has been completed!

Amount: ${amountUSD} (${data.amount.toLocaleString()} coins)

The funds have been sent to your bank account and should arrive within 1-2 business days.

Keep creating amazing content!

Best regards,
The Digis Team
  `.trim();

  return await sendEmail(data.creatorEmail, subject, message);
}

/**
 * Send payout failed email
 */
export async function sendPayoutFailedEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);

  const subject = '❌ Payout Failed - Action Required - Digis';
  const message = `
Hi ${data.creatorName},

Unfortunately, your payout could not be completed.

Amount: ${amountUSD} (${data.amount.toLocaleString()} coins)
Reason: ${data.failureReason || 'Unknown error'}

The coins have been returned to your balance. Please update your banking information and try again.

If you need help, please contact support.

Best regards,
The Digis Team
  `.trim();

  return await sendEmail(data.creatorEmail, subject, message);
}

/**
 * Send coin purchase confirmation email
 */
export async function sendCoinPurchaseEmail(
  userEmail: string,
  userName: string,
  coins: number,
  amountPaid: string
) {
  const subject = '🪙 Coin Purchase Confirmed - Digis';
  const message = `
Hi ${userName},

Thank you for your purchase!

Coins Purchased: ${coins.toLocaleString()} Digis Coins
Amount Paid: ${amountPaid}

Your coins have been added to your wallet and are ready to use!

Start exploring creators and enjoy your experience on Digis.

Best regards,
The Digis Team
  `.trim();

  return await sendEmail(userEmail, subject, message);
}

/**
 * Helper function to send email using Supabase Auth
 * Note: This is a placeholder - Supabase doesn't have a direct email API
 * In production, integrate with Resend, SendGrid, or similar
 */
async function sendEmail(to: string, subject: string, message: string) {
  try {
    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // For now, log the email
    console.log('📧 Email would be sent:', {
      to,
      subject,
      message: message.substring(0, 100) + '...',
    });

    // Placeholder return
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * TODO: Integration Guide for Production
 *
 * Option 1: Resend (Recommended - Simple & Modern)
 * npm install resend
 *
 * import { Resend } from 'resend';
 * const resend = new Resend(process.env.RESEND_API_KEY);
 * await resend.emails.send({ from, to, subject, text: message });
 *
 * Option 2: SendGrid
 * npm install @sendgrid/mail
 *
 * import sgMail from '@sendgrid/mail';
 * sgMail.setApiKey(process.env.SENDGRID_API_KEY);
 * await sgMail.send({ to, from, subject, text: message });
 *
 * Option 3: AWS SES
 * npm install @aws-sdk/client-ses
 */
