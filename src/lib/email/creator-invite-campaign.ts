import { Resend } from 'resend';

// Initialize Resend only if API key is available (prevents build errors)
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Use examodels.com for better deliverability (established domain)
const CAMPAIGN_FROM = 'EXA Models <hello@examodels.com>';

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
  batchSize: 10,
  minDelay: 1000,    // 1 second (minimal delay for rate limiting)
  maxDelay: 2000,    // 2 seconds
  dailyLimit: 250,   // Safe limit for established domain (examodels.com)
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
  const greeting = recipientName ? `Hey ${recipientName},` : 'Hey,';

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
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                                Stop leaving money on the table
                            </h1>
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
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.9);">
                                            You've got the followers. You've got the content. But Instagram doesn't pay you.
                                        </p>
                                        <p style="margin: 0 0 24px; color: rgba(255, 255, 255, 0.9);">
                                            <strong style="color: #00D4FF;">Digis does.</strong>
                                        </p>
                                        <p style="margin: 0 0 24px; color: rgba(255, 255, 255, 0.7);">
                                            We're an invite-only platform where models and fitness creators are actually getting paid — not just likes.
                                        </p>
                                        <p style="margin: 0 0 16px; color: rgba(255, 255, 255, 0.9); font-weight: 600;">
                                            Here's what girls in Miami and LA are doing on Digis:
                                        </p>

                                        <!-- Feature list with icons -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; vertical-align: top; padding-top: 2px;">
                                                                <span style="color: #FF006E; font-size: 18px;">📸</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: rgba(255, 255, 255, 0.9);">
                                                                <strong>Exclusive Content</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 15px;">Sell the photos and videos that are "too much" for IG. You set the price.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; vertical-align: top; padding-top: 2px;">
                                                                <span style="color: #00D4FF; font-size: 18px;">📹</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: rgba(255, 255, 255, 0.9);">
                                                                <strong>Paid Video Calls</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 15px;">Fans pay YOUR rate for 1-on-1 calls. 10 minutes, 30 minutes — you decide.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; vertical-align: top; padding-top: 2px;">
                                                                <span style="color: #9D4EDD; font-size: 18px;">🤖</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: rgba(255, 255, 255, 0.9);">
                                                                <strong>AI Twin</strong> <span style="color: #9D4EDD;">(This one's wild)</span><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 15px;">Your AI answers DMs and takes voice calls 24/7. You literally make money in your sleep.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; vertical-align: top; padding-top: 2px;">
                                                                <span style="color: #FF006E; font-size: 18px;">🍷</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: rgba(255, 255, 255, 0.9);">
                                                                <strong>Virtual Dates</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 15px;">Fans pay for virtual dinner dates and private video calls. Set your rate, keep your boundaries.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; vertical-align: top; padding-top: 2px;">
                                                                <span style="color: #00CC88; font-size: 18px;">🏋️</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: rgba(255, 255, 255, 0.9);">
                                                                <strong>Private Training Sessions</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 15px;">Fitness creators are booking paid video calls for personalized workouts and coaching.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin: 0; padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; color: rgba(255, 255, 255, 0.8); font-size: 15px;">
                                            No algorithms. No shadowbans. Just you, your content, and fans who actually pay.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Username urgency -->
                                <tr>
                                    <td style="padding: 0 0 20px; color: rgba(255, 255, 255, 0.7); font-size: 15px;">
                                        Usernames are first come, first serve — and the good ones are going fast.
                                    </td>
                                </tr>

                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 10px 0 35px;">
                                        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); color: #ffffff; text-decoration: none; padding: 20px 56px; border-radius: 50px; font-size: 18px; font-weight: 700; box-shadow: 0 8px 32px rgba(157, 78, 221, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset;">
                                            Claim Your Username
                                        </a>
                                    </td>
                                </tr>

                                <!-- Alternative Link -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
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
                            <p style="margin: 0 0 8px; color: rgba(255, 255, 255, 0.6); font-size: 13px;">
                                See you inside,<br><strong>Team Digis</strong>
                            </p>
                            <p style="margin: 0 0 12px; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
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
  const greeting = recipientName ? `Hey ${recipientName},` : 'Hey,';

  return `${greeting}

You've got the followers. You've got the content. But Instagram doesn't pay you.

Digis does.

We're an invite-only platform where models and fitness creators are actually getting paid — not just likes.

Here's what girls in Miami and LA are doing on Digis:

📸 Exclusive Content
Sell the photos and videos that are "too much" for IG. You set the price.

📹 Paid Video Calls
Fans pay YOUR rate for 1-on-1 calls. 10 minutes, 30 minutes — you decide.

🤖 AI Twin (This one's wild)
Your AI answers DMs and takes voice calls 24/7. You literally make money in your sleep.

🍷 Virtual Dates
Fans pay for virtual dinner dates and private video calls. Set your rate, keep your boundaries.

🏋️ Private Training Sessions
Fitness creators are booking paid video calls for personalized workouts and coaching.

---

No algorithms. No shadowbans. Just you, your content, and fans who actually pay.

Usernames are first come, first serve — and the good ones are going fast.

Claim your username: ${inviteUrl}

See you inside,
Team Digis

---

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
    const subject = recipient.name
      ? `${recipient.name}, stop leaving money on the table`
      : "Stop leaving money on the table";

    const { data, error } = await resend.emails.send({
      from: CAMPAIGN_FROM,
      to: recipient.email,
      subject,
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
export async function testInviteEmail(testEmail: string): Promise<{ success: boolean; error?: string }> {
  console.log('[Campaign] Testing email to:', testEmail);
  console.log('[Campaign] Resend configured:', !!resend);

  const result = await sendCreatorInvite({
    email: testEmail,
    name: 'Test Creator',
    inviteUrl: 'https://digis.cc/claim/test123',
  });

  console.log('[Campaign] Test result:', result);
  return { success: result.success, error: result.error };
}

// Generate reminder email HTML
function generateReminderHtml(inviteUrl: string, recipientName?: string): string {
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey there!';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Don't forget to claim your Digis invite!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #FFB800 0%, #FF6B00 100%); padding: 50px 40px 40px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                                Your invite is waiting!
                            </h1>
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
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.9);">
                                            Just a friendly reminder — you haven't claimed your <strong style="color: #00D4FF;">Digis</strong> invite yet!
                                        </p>
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.7);">
                                            We're still holding your spot, but usernames are first come, first serve. Don't miss out on getting your preferred username!
                                        </p>
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9);">
                                            <span style="color: #FFB800;">►</span> Live Streaming<br>
                                            <span style="color: #FF006E;">◈</span> Digitals<br>
                                            <span style="color: #9D4EDD;">✧</span> AI Twin<br>
                                            <span style="color: #00CC88;">▣</span> Paid Video Calls<br>
                                            <span style="color: #00D4FF;">✦</span> And more!
                                        </p>
                                    </td>
                                </tr>

                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 10px 0 35px;">
                                        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #FFB800 0%, #FF6B00 100%); color: #ffffff; text-decoration: none; padding: 20px 56px; border-radius: 50px; font-size: 18px; font-weight: 700; box-shadow: 0 8px 32px rgba(255, 107, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;">
                                            Claim My Invite
                                        </a>
                                    </td>
                                </tr>

                                <!-- Alternative Link -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.5); font-size: 13px; line-height: 1.6; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.08);">
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

// Generate reminder plain text
function generateReminderPlainText(inviteUrl: string, recipientName?: string): string {
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey there!';

  return `${greeting}

Just a friendly reminder — you haven't claimed your Digis invite yet!

We're still holding your spot, but usernames are first come, first serve. Don't miss out on getting your preferred username!

► Live Streaming
◈ Digitals
✧ AI Twin
▣ Paid Video Calls
✦ And more!

Claim your invite: ${inviteUrl}

Wasn't expecting this? No worries, just ignore this email.

© 2025 Digis · digis.cc`;
}

// Send invite reminder email
export async function sendInviteReminder(recipient: InviteRecipient): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!resend) {
    console.log(`[Campaign] [DEV] Would send reminder to ${recipient.email}`);
    return { success: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: CAMPAIGN_FROM,
      to: recipient.email,
      subject: "Don't forget to claim your Digis invite!",
      html: generateReminderHtml(recipient.inviteUrl, recipient.name),
      text: generateReminderPlainText(recipient.inviteUrl, recipient.name),
    });

    if (error) {
      console.error(`[Campaign] Failed to send reminder to ${recipient.email}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[Campaign] Reminder sent to ${recipient.email}, ID: ${data?.id}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Campaign] Error sending reminder to ${recipient.email}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
