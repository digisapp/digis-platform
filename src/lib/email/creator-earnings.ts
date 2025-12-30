import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = 'Digis <notifications@digis.cc>';

interface CreatorEarningsEmailData {
  creatorEmail: string;
  creatorName: string;
  fanName: string;
  fanUsername: string;
  amount: number;
  eventType: 'purchase' | 'tip' | 'gift' | 'call_request';
  contentTitle?: string;
  giftName?: string;
  callType?: 'video' | 'voice';
  message?: string;
}

// Generate email HTML for creator earnings
function generateEarningsHtml(data: CreatorEarningsEmailData): string {
  const { creatorName, fanName, fanUsername, amount, eventType, contentTitle, giftName, callType, message } = data;

  let emoji = '';
  let headline = '';
  let details = '';
  let ctaText = 'View on Digis';
  let ctaUrl = 'https://digis.cc/creator/wallet';

  switch (eventType) {
    case 'purchase':
      emoji = '💰';
      headline = 'You made a sale!';
      details = `<strong>${fanName}</strong> (@${fanUsername}) just purchased your content${contentTitle ? ` "<em>${contentTitle}</em>"` : ''} for <strong>${amount} coins</strong>!`;
      ctaUrl = 'https://digis.cc/creator/content';
      break;
    case 'tip':
    case 'gift':
      emoji = '🎁';
      headline = 'You received a gift!';
      details = giftName
        ? `<strong>${fanName}</strong> (@${fanUsername}) sent you <strong>${giftName}</strong> (${amount} coins)!`
        : `<strong>${fanName}</strong> (@${fanUsername}) sent you <strong>${amount} coins</strong>!`;
      if (message) {
        details += `<br><br><em>"${message}"</em>`;
      }
      break;
    case 'call_request':
      emoji = '📱';
      headline = 'New call request!';
      details = `<strong>${fanName}</strong> (@${fanUsername}) wants to ${callType === 'video' ? 'video' : 'voice'} call you! Estimated: <strong>${amount} coins</strong>`;
      ctaText = 'View Request';
      ctaUrl = 'https://digis.cc/creator/calls';
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px;">
                            <p style="margin: 0 0 12px; font-size: 48px;">${emoji}</p>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                                ${headline}
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 16px; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                                Hey ${creatorName}!
                            </p>
                            <p style="margin: 0 0 24px; color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.6;">
                                ${details}
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 16px 0;">
                                        <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 50px; font-size: 16px; font-weight: 700;">
                                            ${ctaText}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: rgba(0, 0, 0, 0.3); padding: 24px; text-align: center;">
                            <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                                You're receiving this because you earned on Digis.<br>
                                <a href="https://digis.cc/settings" style="color: rgba(255, 255, 255, 0.5); text-decoration: none;">Manage notifications</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// Generate plain text version
function generateEarningsText(data: CreatorEarningsEmailData): string {
  const { creatorName, fanName, fanUsername, amount, eventType, contentTitle, giftName, callType, message } = data;

  let headline = '';
  let details = '';

  switch (eventType) {
    case 'purchase':
      headline = 'You made a sale!';
      details = `${fanName} (@${fanUsername}) just purchased your content${contentTitle ? ` "${contentTitle}"` : ''} for ${amount} coins!`;
      break;
    case 'tip':
    case 'gift':
      headline = 'You received a gift!';
      details = giftName
        ? `${fanName} (@${fanUsername}) sent you ${giftName} (${amount} coins)!`
        : `${fanName} (@${fanUsername}) sent you ${amount} coins!`;
      if (message) {
        details += `\n\n"${message}"`;
      }
      break;
    case 'call_request':
      headline = 'New call request!';
      details = `${fanName} (@${fanUsername}) wants to ${callType === 'video' ? 'video' : 'voice'} call you! Estimated: ${amount} coins`;
      break;
  }

  return `${headline}

Hey ${creatorName}!

${details}

View on Digis: https://digis.cc/creator/wallet

---
You're receiving this because you earned on Digis.
Manage notifications: https://digis.cc/settings`;
}

// Send creator earnings notification email
export async function sendCreatorEarningsEmail(data: CreatorEarningsEmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('[Email] [DEV] Would send earnings email:', data.eventType, 'to', data.creatorEmail);
    return { success: true };
  }

  const subjectMap = {
    purchase: `💰 You made a sale on Digis!`,
    tip: `🎁 You received a gift on Digis!`,
    gift: `🎁 You received a gift on Digis!`,
    call_request: `📱 New video call request on Digis!`,
  };

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.creatorEmail,
      subject: subjectMap[data.eventType],
      html: generateEarningsHtml(data),
      text: generateEarningsText(data),
    });

    if (error) {
      console.error('[Email] Failed to send earnings email:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] Sent earnings notification:', data.eventType, 'to', data.creatorEmail);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Error sending earnings email:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Convenience functions for each event type
export async function notifyContentPurchase(
  creatorEmail: string,
  creatorName: string,
  fanName: string,
  fanUsername: string,
  amount: number,
  contentTitle?: string
) {
  return sendCreatorEarningsEmail({
    creatorEmail,
    creatorName,
    fanName,
    fanUsername,
    amount,
    eventType: 'purchase',
    contentTitle,
  });
}

export async function notifyGiftReceived(
  creatorEmail: string,
  creatorName: string,
  fanName: string,
  fanUsername: string,
  amount: number,
  giftName?: string,
  message?: string
) {
  return sendCreatorEarningsEmail({
    creatorEmail,
    creatorName,
    fanName,
    fanUsername,
    amount,
    eventType: 'gift',
    giftName,
    message,
  });
}

export async function notifyCallRequest(
  creatorEmail: string,
  creatorName: string,
  fanName: string,
  fanUsername: string,
  estimatedAmount: number,
  callType: 'video' | 'voice'
) {
  return sendCreatorEarningsEmail({
    creatorEmail,
    creatorName,
    fanName,
    fanUsername,
    amount: estimatedAmount,
    eventType: 'call_request',
    callType,
  });
}
