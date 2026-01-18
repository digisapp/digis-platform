import { formatCoinsAsUSD } from '@/lib/stripe/constants';
import { sendEmail } from './resend';
import { baseEmailTemplate, infoBox, alertBox } from './templates';

/**
 * Payout notification emails with beautiful HTML templates
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
  const coinsFormatted = data.amount.toLocaleString();

  const html = baseEmailTemplate({
    preheader: `Your payout request for ${amountUSD} has been received`,
    title: 'Payout Request Received',
    emoji: '💰',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">Great news! We've received your payout request and it's now in the queue.</p>

      ${infoBox([
        { label: 'Amount', value: amountUSD },
        { label: 'Coins', value: `${coinsFormatted} coins` },
        { label: 'Requested', value: data.requestedAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
        { label: 'Status', value: '⏳ Pending Review' },
      ])}

      <p style="margin: 16px 0 0;">Your payout will be processed within <strong>2-3 business days</strong>. We'll send you another email once it's on its way!</p>
    `,
    ctaText: 'View Earnings',
    ctaUrl: 'https://digis.cc/creator/earnings',
    footerNote: 'Keep creating amazing content! Your fans love you.',
  });

  const text = `
Hey ${data.creatorName}!

We've received your payout request!

Amount: ${amountUSD} (${coinsFormatted} coins)
Requested: ${data.requestedAt.toLocaleDateString()}

Your payout will be processed within 2-3 business days. We'll send you another email once it's completed.

View your earnings: https://digis.cc/creator/earnings

- The Digis Team
  `.trim();

  return await sendEmail({
    to: data.creatorEmail,
    subject: `💰 Payout Request Received - ${amountUSD}`,
    html,
    text,
  });
}

/**
 * Send payout processing started email
 */
export async function sendPayoutProcessingEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);
  const coinsFormatted = data.amount.toLocaleString();

  const html = baseEmailTemplate({
    preheader: `Your ${amountUSD} payout is being processed`,
    title: 'Payout Processing',
    emoji: '⏳',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">Your payout is now being processed and on its way to your bank account!</p>

      ${infoBox([
        { label: 'Amount', value: amountUSD },
        { label: 'Coins', value: `${coinsFormatted} coins` },
        { label: 'Status', value: '🔄 Processing' },
        { label: 'ETA', value: '1-2 business days' },
      ])}

      <p style="margin: 16px 0 0;">The funds should arrive in your bank account within <strong>1-2 business days</strong>. You'll receive a confirmation once it's complete.</p>
    `,
    ctaText: 'View Earnings',
    ctaUrl: 'https://digis.cc/creator/earnings',
  });

  const text = `
Hey ${data.creatorName}!

Good news! Your payout is now being processed.

Amount: ${amountUSD} (${coinsFormatted} coins)

The funds should arrive in your bank account within 1-2 business days.

- The Digis Team
  `.trim();

  return await sendEmail({
    to: data.creatorEmail,
    subject: `⏳ Your ${amountUSD} Payout is Processing`,
    html,
    text,
  });
}

/**
 * Send payout completed email
 */
export async function sendPayoutCompletedEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);
  const coinsFormatted = data.amount.toLocaleString();

  const html = baseEmailTemplate({
    preheader: `${amountUSD} has been sent to your bank account!`,
    title: 'Payout Complete!',
    emoji: '🎉',
    greeting: `Hey ${data.creatorName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">Your payout has been completed and the money is on its way!</p>

      ${infoBox([
        { label: 'Amount Sent', value: amountUSD },
        { label: 'Coins Cashed Out', value: `${coinsFormatted} coins` },
        { label: 'Status', value: '✅ Complete' },
      ])}

      ${alertBox('The funds should appear in your bank account within 1-2 business days depending on your bank.', 'success')}

      <p style="margin: 16px 0 0;">Keep up the amazing work! Your fans appreciate everything you do.</p>
    `,
    ctaText: 'View Earnings',
    ctaUrl: 'https://digis.cc/creator/earnings',
    footerNote: 'Questions? Just reply to this email.',
  });

  const text = `
Hey ${data.creatorName}!

Your payout has been completed!

Amount: ${amountUSD} (${coinsFormatted} coins)
Status: Complete

The funds have been sent to your bank account and should arrive within 1-2 business days.

Keep creating amazing content!

- The Digis Team
  `.trim();

  return await sendEmail({
    to: data.creatorEmail,
    subject: `✅ ${amountUSD} Payout Complete!`,
    html,
    text,
  });
}

/**
 * Send payout failed email
 */
export async function sendPayoutFailedEmail(data: PayoutNotificationData) {
  const amountUSD = formatCoinsAsUSD(data.amount);
  const coinsFormatted = data.amount.toLocaleString();

  const html = baseEmailTemplate({
    preheader: `Action required: Your payout could not be completed`,
    title: 'Payout Failed',
    emoji: '😔',
    greeting: `Hey ${data.creatorName},`,
    body: `
      <p style="margin: 0 0 16px;">Unfortunately, we couldn't complete your payout. But don't worry — your coins are safe!</p>

      ${infoBox([
        { label: 'Amount', value: amountUSD },
        { label: 'Coins', value: `${coinsFormatted} coins` },
        { label: 'Status', value: '❌ Failed' },
      ])}

      ${alertBox(`<strong>Reason:</strong> ${data.failureReason || 'There was an issue with your banking information. Please verify your details and try again.'}`, 'error')}

      <p style="margin: 16px 0 0;">The coins have been <strong>returned to your balance</strong>. Please update your banking information and request a new payout.</p>
    `,
    ctaText: 'Update Banking Info',
    ctaUrl: 'https://digis.cc/creator/earnings',
    footerNote: 'Need help? Reply to this email and we\'ll sort it out.',
  });

  const text = `
Hey ${data.creatorName},

Unfortunately, your payout could not be completed.

Amount: ${amountUSD} (${coinsFormatted} coins)
Reason: ${data.failureReason || 'Issue with banking information'}

The coins have been returned to your balance. Please update your banking information and try again.

Update banking info: https://digis.cc/creator/earnings

Need help? Just reply to this email.

- The Digis Team
  `.trim();

  return await sendEmail({
    to: data.creatorEmail,
    subject: `❌ Payout Failed - Action Required`,
    html,
    text,
  });
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
  const coinsFormatted = coins.toLocaleString();

  const html = baseEmailTemplate({
    preheader: `You just purchased ${coinsFormatted} Digis Coins!`,
    title: 'Coins Added!',
    emoji: '🪙',
    greeting: `Hey ${userName}! 👋`,
    body: `
      <p style="margin: 0 0 16px;">Thanks for your purchase! Your coins are ready to use.</p>

      ${infoBox([
        { label: 'Coins Purchased', value: `${coinsFormatted} coins` },
        { label: 'Amount Paid', value: amountPaid },
        { label: 'Status', value: '✅ Added to Wallet' },
      ])}

      <p style="margin: 16px 0 0;">Your coins have been added to your wallet and are ready to spend on your favorite creators!</p>
    `,
    ctaText: 'Explore Creators',
    ctaUrl: 'https://digis.cc/explore',
    footerNote: 'Go show some love to your favorite creators!',
  });

  const text = `
Hey ${userName}!

Thank you for your purchase!

Coins Purchased: ${coinsFormatted} Digis Coins
Amount Paid: ${amountPaid}

Your coins have been added to your wallet and are ready to use!

Explore creators: https://digis.cc/explore

- The Digis Team
  `.trim();

  return await sendEmail({
    to: userEmail,
    subject: `🪙 ${coinsFormatted} Coins Added to Your Wallet!`,
    html,
    text,
  });
}
