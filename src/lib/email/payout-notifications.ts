import { formatCoinsAsUSD } from '@/lib/stripe/config';
import { sendEmail } from './resend';

/**
 * Send email notification for payout events
 * Uses Resend for transactional emails
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

  return await sendEmail({ to: data.creatorEmail, subject, text: message });
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

  return await sendEmail({ to: data.creatorEmail, subject, text: message });
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

  return await sendEmail({ to: data.creatorEmail, subject, text: message });
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

  return await sendEmail({ to: data.creatorEmail, subject, text: message });
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

  return await sendEmail({ to: userEmail, subject, text: message });
}
