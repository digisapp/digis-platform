import { Resend } from 'resend';

// Initialize Resend only if API key is available (prevents build errors)
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Use examodels.com for better deliverability (established domain)
const CAMPAIGN_FROM = 'Digis Team <hello@examodels.com>';

interface InviteRecipient {
  email: string;
  name?: string;
  inviteUrl: string;
}

interface BatchConfig {
  batchSize: number;       // Emails per batch (5-10 recommended)
  minDelay: number;        // Min delay between batches (ms)
  maxDelay: number;        // Max delay between batches (ms)
  dailyLimit: number;      // Max emails per day
}

const DEFAULT_CONFIG: BatchConfig = {
  batchSize: 5,
  minDelay: 30000,   // 30 seconds
  maxDelay: 90000,   // 90 seconds
  dailyLimit: 50,
};

// Generate random delay between min and max
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate the invite email HTML
function generateInviteHtml(inviteUrl: string, recipientName?: string): string {
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey there!';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Digis</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 50px 40px 40px;">
                            <p style="margin: 0 0 12px; font-size: 48px;">✨</p>
                            <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 900; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                                You're Invited
                            </h1>
                            <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; font-weight: 500;">
                                Join the next-gen creator platform
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #ffffff; font-size: 17px; line-height: 1.7; padding-bottom: 24px;">
                                        <p style="margin: 0 0 16px; color: rgba(255, 255, 255, 0.9);">
                                            ${greeting}
                                        </p>
                                        <p style="margin: 0 0 16px; color: rgba(255, 255, 255, 0.9);">
                                            You've been personally invited to join <strong style="color: #00D4FF;">Digis</strong> — the creator platform built for the next generation.
                                        </p>
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.7);">
                                            Monetize through live streams, paid video calls, AI twins, and direct fan engagement. We're currently invite-only and would love to have you.
                                        </p>
                                    </td>
                                </tr>

                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 10px 0 35px;">
                                        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); color: #ffffff; text-decoration: none; padding: 20px 56px; border-radius: 50px; font-size: 18px; font-weight: 700; box-shadow: 0 8px 32px rgba(157, 78, 221, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset;">
                                            Claim Your Invite
                                        </a>
                                    </td>
                                </tr>

                                <!-- Features -->
                                <tr>
                                    <td style="padding: 30px 0; border-top: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                                            Ways to earn on Digis
                                        </p>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top;">
                                                                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%); border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">🎥</div>
                                                            </td>
                                                            <td style="vertical-align: top;">
                                                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Live Streaming</p>
                                                                <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.6); font-size: 13px;">Go live and earn from gifts and tickets</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top;">
                                                                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, rgba(157, 78, 221, 0.2) 0%, rgba(157, 78, 221, 0.1) 100%); border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">🤖</div>
                                                            </td>
                                                            <td style="vertical-align: top;">
                                                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">AI Twin</p>
                                                                <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.6); font-size: 13px;">Earn 24/7 with your AI clone</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top;">
                                                                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, rgba(255, 0, 110, 0.2) 0%, rgba(255, 0, 110, 0.1) 100%); border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">📱</div>
                                                            </td>
                                                            <td style="vertical-align: top;">
                                                                <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">Paid Video Calls</p>
                                                                <p style="margin: 4px 0 0; color: rgba(255, 255, 255, 0.6); font-size: 13px;">Set your rate for 1-on-1 fan calls</p>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Alternative Link -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6; padding-top: 24px;">
                                        <p style="margin: 0 0 8px;">
                                            Button not working? Copy this link:
                                        </p>
                                        <p style="margin: 0; word-break: break-all;">
                                            <a href="${inviteUrl}" style="color: #00D4FF; text-decoration: none; font-size: 12px;">${inviteUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: rgba(0, 0, 0, 0.4); padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 12px; color: rgba(255, 255, 255, 0.5); font-size: 13px;">
                                Wasn't expecting this? No worries, just ignore this email.
                            </p>
                            <p style="margin: 0; color: rgba(255, 255, 255, 0.3); font-size: 11px;">
                                © 2025 Digis · <a href="https://digis.cc" style="color: rgba(255, 255, 255, 0.4); text-decoration: none;">digis.cc</a>
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
function generateInvitePlainText(inviteUrl: string, recipientName?: string): string {
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey there!';

  return `${greeting}

You've been personally invited to join Digis — the creator platform built for the next generation.

Monetize through live streams, paid video calls, AI twins, and direct fan engagement. We're currently invite-only and would love to have you.

Claim your invite: ${inviteUrl}

Ways to earn on Digis:
- Live Streaming: Go live and earn from gifts and tickets
- AI Twin: Earn 24/7 with your AI clone
- Paid Video Calls: Set your rate for 1-on-1 fan calls

Wasn't expecting this? No worries, just ignore this email.

© 2025 Digis · digis.cc`;
}

// Send a single invite email
export async function sendCreatorInvite(recipient: InviteRecipient): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  if (!resend) {
    console.log(`[Campaign] [DEV] Would send invite to ${recipient.email}`);
    return { success: true, id: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: CAMPAIGN_FROM,
      to: recipient.email,
      subject: "✨ You're invited to join Digis",
      html: generateInviteHtml(recipient.inviteUrl, recipient.name),
      text: generateInvitePlainText(recipient.inviteUrl, recipient.name),
    });

    if (error) {
      console.error(`[Campaign] Failed to send to ${recipient.email}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Campaign] Sent invite to ${recipient.email}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Campaign] Error sending to ${recipient.email}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Send batch invites with delays
export async function sendBatchInvites(
  recipients: InviteRecipient[],
  config: Partial<BatchConfig> = {},
  onProgress?: (sent: number, total: number, failed: number) => void
): Promise<{
  sent: number;
  failed: number;
  results: Array<{ email: string; success: boolean; error?: string }>;
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const results: Array<{ email: string; success: boolean; error?: string }> = [];
  let sent = 0;
  let failed = 0;

  // Limit to daily limit
  const toSend = recipients.slice(0, cfg.dailyLimit);

  console.log(`[Campaign] Starting batch send: ${toSend.length} emails, batch size: ${cfg.batchSize}`);

  // Process in batches
  for (let i = 0; i < toSend.length; i += cfg.batchSize) {
    const batch = toSend.slice(i, i + cfg.batchSize);

    console.log(`[Campaign] Processing batch ${Math.floor(i / cfg.batchSize) + 1}, emails ${i + 1}-${i + batch.length}`);

    // Send batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (recipient) => {
        const result = await sendCreatorInvite(recipient);
        return { email: recipient.email, ...result };
      })
    );

    // Track results
    for (const result of batchResults) {
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    // Report progress
    onProgress?.(sent, toSend.length, failed);

    // Delay before next batch (except for last batch)
    if (i + cfg.batchSize < toSend.length) {
      const delay = getRandomDelay(cfg.minDelay, cfg.maxDelay);
      console.log(`[Campaign] Waiting ${Math.round(delay / 1000)}s before next batch...`);
      await sleep(delay);
    }
  }

  console.log(`[Campaign] Complete! Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed, results };
}

// Test the email setup
export async function testInviteEmail(testEmail: string): Promise<boolean> {
  const result = await sendCreatorInvite({
    email: testEmail,
    name: 'Test Creator',
    inviteUrl: 'https://digis.cc/onboarding?invite=test123',
  });
  return result.success;
}
