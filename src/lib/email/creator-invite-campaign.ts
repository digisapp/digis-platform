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

// ============================================
// EXA MODELS CAMPAIGN - Fun & Vibey Template
// ============================================

// Generate the EXA Models vibey invite email HTML
function generateExaModelsInviteHtml(inviteUrl: string, recipientName?: string): string {
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey you!';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EXA Models invites you to be a Creator on Digis - Create & Earn</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(180deg, #0a0014 0%, #1a0a2e 50%, #0a0014 100%);">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0a0014 0%, #1a0a2e 50%, #0a0014 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(157, 78, 221, 0.15) 0%, rgba(255, 0, 110, 0.08) 50%, rgba(0, 212, 255, 0.05) 100%); border: 1px solid rgba(157, 78, 221, 0.3); border-radius: 32px; overflow: hidden; box-shadow: 0 24px 80px rgba(157, 78, 221, 0.25), 0 0 120px rgba(255, 0, 110, 0.1);">

                    <!-- Sparkle Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #FF006E 0%, #9D4EDD 40%, #00D4FF 100%); padding: 50px 40px 45px; position: relative;">
                            <p style="margin: 0 0 8px; font-size: 40px; line-height: 1;">📱✨</p>
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900; text-shadow: 0 4px 20px rgba(0,0,0,0.4); letter-spacing: -0.5px;">
                                Create & Earn<br>Live Your Best Life
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 45px 40px 35px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #ffffff; font-size: 18px; line-height: 1.8; padding-bottom: 20px;">
                                        <p style="margin: 0 0 20px; color: rgba(255, 255, 255, 0.95); font-weight: 500;">
                                            ${greeting}
                                        </p>
                                        <p style="margin: 0 0 24px; color: rgba(255, 255, 255, 0.85);">
                                            <strong style="color: #FF006E;">EXA Models</strong> invites you to join Digis — your new way to earn while living your best life. 🌴
                                        </p>
                                        <p style="margin: 0 0 28px; color: rgba(255, 255, 255, 0.85);">
                                            <span style="color: #00D4FF; font-weight: 600;">Digis</span> is where creators like you are turning time and content into actual income. Work from anywhere.
                                        </p>
                                    </td>
                                </tr>

                                <!-- What's the vibe -->
                                <tr>
                                    <td style="padding-bottom: 28px;">
                                        <p style="margin: 0 0 20px; color: #9D4EDD; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                                            ⚡ What's the vibe?
                                        </p>

                                        <!-- Feature Cards -->
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                                            <tr>
                                                <td style="padding: 16px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 212, 255, 0.05) 100%); border-radius: 16px; border: 1px solid rgba(0, 212, 255, 0.2);">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top; padding-top: 2px;">
                                                                <span style="font-size: 24px;">📹</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: #ffffff;">
                                                                <strong style="font-size: 16px;">Paid Video Calls</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">Fans pay YOUR rate for 1-on-1 calls. 10 minutes, 30 minutes — you decide.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                                            <tr>
                                                <td style="padding: 16px; background: linear-gradient(135deg, rgba(157, 78, 221, 0.2) 0%, rgba(157, 78, 221, 0.05) 100%); border-radius: 16px; border: 1px solid rgba(157, 78, 221, 0.2);">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top; padding-top: 2px;">
                                                                <span style="font-size: 24px;">🤖</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: #ffffff;">
                                                                <strong style="font-size: 16px;">AI Twin (This one's wild)</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">Your AI answers DMs and takes voice calls 24/7. You literally make money in your sleep.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                                            <tr>
                                                <td style="padding: 16px; background: linear-gradient(135deg, rgba(255, 140, 0, 0.2) 0%, rgba(255, 140, 0, 0.05) 100%); border-radius: 16px; border: 1px solid rgba(255, 140, 0, 0.2);">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top; padding-top: 2px;">
                                                                <span style="font-size: 24px;">🔥</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: #ffffff;">
                                                                <strong style="font-size: 16px;">Go Live GRWM & Get Tips</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">Stream, vibe with fans, and watch the tips roll in.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                                            <tr>
                                                <td style="padding: 16px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.05) 100%); border-radius: 16px; border: 1px solid rgba(236, 72, 153, 0.2);">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top; padding-top: 2px;">
                                                                <span style="font-size: 24px;">📸</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: #ffffff;">
                                                                <strong style="font-size: 16px;">Sell Your Content</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">Photos, videos, fitness courses — whatever you create.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                                            <tr>
                                                <td style="padding: 16px; background: linear-gradient(135deg, rgba(0, 204, 136, 0.2) 0%, rgba(0, 204, 136, 0.05) 100%); border-radius: 16px; border: 1px solid rgba(0, 204, 136, 0.2);">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top; padding-top: 2px;">
                                                                <span style="font-size: 24px;">🏋️</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: #ffffff;">
                                                                <strong style="font-size: 16px;">Private Training Sessions</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">Fitness creators are booking paid video calls for personalized workouts and coaching.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 16px; background: linear-gradient(135deg, rgba(255, 0, 110, 0.2) 0%, rgba(255, 0, 110, 0.05) 100%); border-radius: 16px; border: 1px solid rgba(255, 0, 110, 0.2);">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 44px; vertical-align: top; padding-top: 2px;">
                                                                <span style="font-size: 24px;">🍷</span>
                                                            </td>
                                                            <td style="vertical-align: top; color: #ffffff;">
                                                                <strong style="font-size: 16px;">Virtual Dates</strong><br>
                                                                <span style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">Fans pay for virtual dinner dates and private video calls. Set your rate, keep your boundaries.</span>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Social proof -->
                                <tr>
                                    <td style="padding: 24px; background: rgba(255, 255, 255, 0.03); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 20px;">
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.9); font-size: 16px; text-align: center; font-style: italic;">
                                            "Finally a platform that actually pays creators what they deserve" ✨
                                        </p>
                                        <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.5); font-size: 13px; text-align: center;">
                                            — Creators in Miami, LA, and NYC are already on Digis
                                        </p>
                                    </td>
                                </tr>

                                <!-- Urgency -->
                                <tr>
                                    <td style="padding: 24px 0 0; text-align: center;">
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.7); font-size: 15px;">
                                            👀 <strong style="color: #FFB800;">Usernames are first come, first serve</strong> — the good ones are going fast!
                                        </p>
                                    </td>
                                </tr>

                                <!-- CTA Button -->
                                <tr>
                                    <td align="center" style="padding: 32px 0 20px;">
                                        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF006E 0%, #9D4EDD 50%, #00D4FF 100%); color: #ffffff; text-decoration: none; padding: 22px 64px; border-radius: 60px; font-size: 18px; font-weight: 800; box-shadow: 0 12px 40px rgba(157, 78, 221, 0.5), 0 0 0 2px rgba(255,255,255,0.15) inset; letter-spacing: 0.5px; text-transform: uppercase;">
                                            Claim Your Spot 🚀
                                        </a>
                                    </td>
                                </tr>

                                <!-- Alternative Link -->
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.4); font-size: 12px; line-height: 1.6; padding-top: 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
                                        <p style="margin: 0 0 6px;">
                                            Button being weird? Copy this link:
                                        </p>
                                        <p style="margin: 0; word-break: break-all;">
                                            <a href="${inviteUrl}" style="color: #00D4FF; text-decoration: none;">${inviteUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: rgba(0, 0, 0, 0.5); padding: 32px 40px; text-align: center;">
                            <p style="margin: 0 0 8px; color: rgba(255, 255, 255, 0.6); font-size: 14px;">
                                Can't wait to see you inside! 💜
                            </p>
                            <p style="margin: 0 0 4px; color: rgba(255, 255, 255, 0.8); font-size: 14px; font-weight: 600;">
                                — The EXA Models & Digis Team
                            </p>
                            <p style="margin: 20px 0 0; color: rgba(255, 255, 255, 0.3); font-size: 11px;">
                                Wasn't expecting this? No worries, just ignore this email.
                            </p>
                            <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.25); font-size: 11px;">
                                © ${new Date().getFullYear()} EXA Models & Digis · <a href="https://digis.cc" style="color: rgba(255, 255, 255, 0.35); text-decoration: none;">digis.cc</a>
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

// Generate EXA Models plain text version
function generateExaModelsInvitePlainText(inviteUrl: string, recipientName?: string): string {
  const greeting = recipientName ? `Hey ${recipientName}!` : 'Hey you!';

  return `${greeting}

EXA Models invites you to be a Creator on Digis 📱✨

Create & Earn — Live Your Best Life

Join Digis — your new way to earn while living your best life.

Digis is where creators like you are turning time and content into actual income. Work from anywhere.

⚡ WHAT'S THE VIBE?

📹 Paid Video Calls
Fans pay YOUR rate for 1-on-1 calls. 10 minutes, 30 minutes — you decide.

🤖 AI Twin (This one's wild)
Your AI answers DMs and takes voice calls 24/7. You literally make money in your sleep.

🔥 Go Live GRWM & Get Tips
Stream, vibe with fans, and watch the tips roll in.

📸 Sell Your Content
Photos, videos, fitness courses — whatever you create.

🏋️ Private Training Sessions
Fitness creators are booking paid video calls for personalized workouts and coaching.

🍷 Virtual Dates
Fans pay for virtual dinner dates and private video calls. Set your rate, keep your boundaries.

---

"Finally a platform that actually pays creators what they deserve" ✨
— Creators in Miami, LA, and NYC are already on Digis

---

👀 Usernames are first come, first serve — the good ones are going fast!

Claim your spot: ${inviteUrl}

Can't wait to see you inside! 💜
— The EXA Models & Digis Team

---

Wasn't expecting this? No worries, just ignore this email.

© ${new Date().getFullYear()} EXA Models & Digis · digis.cc`;
}

// Send EXA Models campaign invite email
export async function sendExaModelsInvite(recipient: InviteRecipient): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  if (!resend) {
    console.log(`[EXA Campaign] [DEV] Would send invite to ${recipient.email}`);
    return { success: true, id: 'dev-mode' };
  }

  try {
    const subject = recipient.name
      ? `${recipient.name}, EXA Models invites you to be a Creator on Digis 📱✨`
      : "EXA Models invites you to be a Creator on Digis 📱✨";

    const { data, error } = await resend.emails.send({
      from: CAMPAIGN_FROM,
      to: recipient.email,
      subject,
      html: generateExaModelsInviteHtml(recipient.inviteUrl, recipient.name),
      text: generateExaModelsInvitePlainText(recipient.inviteUrl, recipient.name),
    });

    if (error) {
      console.error(`[EXA Campaign] Failed to send to ${recipient.email}:`, error);
      return { success: false, error: error.message };
    }

    console.log(`[EXA Campaign] Sent invite to ${recipient.email}, id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[EXA Campaign] Error sending to ${recipient.email}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Send batch EXA Models invites with delays
// IMPORTANT: Resend has a rate limit of 2 requests/second
// We send emails sequentially with 600ms delay between each to stay under the limit
export async function sendExaModelsBatchInvites(
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

  console.log(`[EXA Campaign] Starting sequential send: ${toSend.length} emails (rate limit: 2/sec)`);

  // Send emails sequentially to respect rate limit (2 requests/second = 500ms minimum between requests)
  // Using 600ms to be safe
  const RATE_LIMIT_DELAY = 600;

  for (let i = 0; i < toSend.length; i++) {
    const recipient = toSend[i];

    console.log(`[EXA Campaign] Sending ${i + 1}/${toSend.length}: ${recipient.email}`);

    const result = await sendExaModelsInvite(recipient);
    results.push({ email: recipient.email, ...result });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Report progress after each email
    onProgress?.(sent, toSend.length, failed);

    // Add delay between emails to respect rate limit (except for last email)
    if (i < toSend.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  console.log(`[EXA Campaign] Complete! Sent: ${sent}, Failed: ${failed}`);
  return { sent, failed, results };
}

// Test the EXA Models email setup
export async function testExaModelsInviteEmail(testEmail: string): Promise<{ success: boolean; error?: string }> {
  console.log('[EXA Campaign] Testing email to:', testEmail);
  console.log('[EXA Campaign] Resend configured:', !!resend);

  const result = await sendExaModelsInvite({
    email: testEmail,
    name: 'Test Creator',
    inviteUrl: 'https://digis.cc/join/test123',
  });

  console.log('[EXA Campaign] Test result:', result);
  return { success: result.success, error: result.error };
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
// IMPORTANT: Resend has a rate limit of 2 requests/second
// We send emails sequentially with 600ms delay between each to stay under the limit
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

  console.log(`[Campaign] Starting sequential send: ${toSend.length} emails (rate limit: 2/sec)`);

  // Send emails sequentially to respect rate limit (2 requests/second = 500ms minimum between requests)
  // Using 600ms to be safe
  const RATE_LIMIT_DELAY = 600;

  for (let i = 0; i < toSend.length; i++) {
    const recipient = toSend[i];

    console.log(`[Campaign] Sending ${i + 1}/${toSend.length}: ${recipient.email}`);

    const result = await sendCreatorInvite(recipient);
    results.push({ email: recipient.email, ...result });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Report progress after each email
    onProgress?.(sent, toSend.length, failed);

    // Add delay between emails to respect rate limit (except for last email)
    if (i < toSend.length - 1) {
      await sleep(RATE_LIMIT_DELAY);
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
