import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = 'Digis <hi@digis.cc>';

interface WelcomeEmailData {
  email: string;
  name: string;
  username: string;
  isCreator?: boolean;
}

function generateWelcomeHtml(data: WelcomeEmailData): string {
  const { name, username, isCreator } = data;

  const features = isCreator
    ? [
        { icon: '🎥', title: 'Go Live', desc: 'Stream to your fans and earn coins in real-time' },
        { icon: '📸', title: 'Share Content', desc: 'Post exclusive photos and videos for your subscribers' },
        { icon: '💬', title: 'DM Fans', desc: 'Chat with fans and receive tips for messages' },
        { icon: '📱', title: 'Video Calls', desc: 'Offer 1-on-1 video calls with your biggest supporters' },
      ]
    : [
        { icon: '⭐', title: 'Follow Creators', desc: 'Discover and follow your favorite creators' },
        { icon: '🎥', title: 'Watch Live', desc: 'Join live streams and interact in real-time' },
        { icon: '💬', title: 'Direct Messages', desc: 'Chat directly with creators you love' },
        { icon: '🎁', title: 'Send Gifts', desc: 'Support creators with tips and virtual gifts' },
      ];

  const featuresHtml = features
    .map(
      (f) => `
        <tr>
          <td style="padding: 12px 0;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="50" style="font-size: 28px; vertical-align: top;">${f.icon}</td>
                <td style="vertical-align: top;">
                  <p style="margin: 0 0 4px; color: #ffffff; font-size: 16px; font-weight: 600;">${f.title}</p>
                  <p style="margin: 0; color: #9ca3af; font-size: 14px;">${f.desc}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Digis!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 40px;">
                            <p style="margin: 0 0 12px; font-size: 48px;">🎉</p>
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                                Welcome to Digis!
                            </h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px; line-height: 1.6;">
                                Hey <strong>${name}</strong>! 👋
                            </p>

                            <p style="margin: 0 0 24px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                                ${isCreator
                                  ? "You're all set up as a creator on Digis! Start earning by connecting with your fans."
                                  : "Thanks for joining Digis! You're now part of a community where you can connect with amazing creators."}
                            </p>

                            <p style="margin: 0 0 16px; color: #ffffff; font-size: 16px; font-weight: 600;">
                                Here's what you can do:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                ${featuresHtml}
                            </table>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://digis.cc/${isCreator ? 'creator/dashboard' : username}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF 0%, #FF006E 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; border-radius: 12px;">
                                            ${isCreator ? 'Go to Dashboard' : 'Explore Digis'}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 32px 0 0; color: #9ca3af; font-size: 14px; line-height: 1.6; text-align: center;">
                                Your username: <strong style="color: #00D4FF;">@${username}</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                            <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                                Questions? Reply to this email or DM us on socials
                            </p>
                            <p style="margin: 0; color: #4b5563; font-size: 11px;">
                                © ${new Date().getFullYear()} Digis. All rights reserved.
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

function generateWelcomePlainText(data: WelcomeEmailData): string {
  const { name, username, isCreator } = data;

  const features = isCreator
    ? `- Go Live: Stream to your fans and earn coins in real-time
- Share Content: Post exclusive photos and videos for your subscribers
- DM Fans: Chat with fans and receive tips for messages
- Video Calls: Offer 1-on-1 video calls with your biggest supporters`
    : `- Follow Creators: Discover and follow your favorite creators
- Watch Live: Join live streams and interact in real-time
- Direct Messages: Chat directly with creators you love
- Send Gifts: Support creators with tips and virtual gifts`;

  return `Welcome to Digis, ${name}!

${isCreator
  ? "You're all set up as a creator on Digis! Start earning by connecting with your fans."
  : "Thanks for joining Digis! You're now part of a community where you can connect with amazing creators."}

Here's what you can do:

${features}

Your username: @${username}

${isCreator ? 'Go to your dashboard: https://digis.cc/creator/dashboard' : `Explore Digis: https://digis.cc/${username}`}

Questions? Just reply to this email!

- The Digis Team
`;
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('[Welcome Email] Resend not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const subject = data.isCreator
      ? `Welcome to Digis, ${data.name}! Let's start earning 💰`
      : `Welcome to Digis, ${data.name}! 🎉`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject,
      html: generateWelcomeHtml(data),
      text: generateWelcomePlainText(data),
    });

    if (error) {
      console.error('[Welcome Email] Failed to send:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Welcome Email] Sent to ${data.email}`);
    return { success: true };
  } catch (error) {
    console.error('[Welcome Email] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
