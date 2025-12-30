import { sendEmail, resend } from './resend';

/**
 * Creator notification emails
 * Handles application approvals, rejections, and audience management
 */

// Resend Audience ID for creators (set in environment)
const CREATORS_AUDIENCE_ID = process.env.RESEND_CREATORS_AUDIENCE_ID;

interface CreatorApprovalData {
  email: string;
  name: string;
  username: string;
}

/**
 * Send email when creator application is approved
 */
export async function sendCreatorApprovalEmail(data: CreatorApprovalData) {
  const subject = "You're In! Welcome to Digis Creators";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #000000;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); padding: 50px 40px;">
              <p style="margin: 0 0 12px; font-size: 48px;">🎉</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900;">You're Approved!</h1>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Welcome to the Digis creator family</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 24px;">
                Hey ${data.name},
              </p>
              <p style="color: rgba(255, 255, 255, 0.8); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Great news! Your creator application has been approved. You now have full access to all creator features on Digis.
              </p>

              <!-- What You Can Do -->
              <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; margin: 24px 0;">
                <p style="color: #00D4FF; font-size: 14px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">What you can do now</p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 20px; margin-right: 12px;">🎥</span>
                      <span style="color: #ffffff; font-size: 15px;">Go live and earn gifts from fans</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 20px; margin-right: 12px;">📱</span>
                      <span style="color: #ffffff; font-size: 15px;">Offer paid 1-on-1 video calls</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 20px; margin-right: 12px;">💬</span>
                      <span style="color: #ffffff; font-size: 15px;">Charge for direct messages</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="font-size: 20px; margin-right: 12px;">🤖</span>
                      <span style="color: #ffffff; font-size: 15px;">Your AI Twin makes money while you sleep</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <a href="https://digis.cc/settings/profile" style="display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #9D4EDD 50%, #FF006E 100%); color: #ffffff; text-decoration: none; padding: 18px 48px; border-radius: 50px; font-size: 16px; font-weight: 700;">
                      Complete My Profile
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; text-align: center; margin: 24px 0 0;">
                Your profile: <a href="https://digis.cc/${data.username}" style="color: #00D4FF;">digis.cc/${data.username}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: rgba(0, 0, 0, 0.4); padding: 24px 40px; text-align: center;">
              <p style="margin: 0; color: rgba(255, 255, 255, 0.4); font-size: 12px;">
                Questions? Reply to this email or contact support@digis.cc
              </p>
              <p style="margin: 12px 0 0; color: rgba(255, 255, 255, 0.3); font-size: 11px;">
                &copy; 2025 Digis &middot; <a href="https://digis.cc" style="color: rgba(255, 255, 255, 0.4); text-decoration: none;">digis.cc</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hey ${data.name},

Great news! Your creator application has been approved. You now have full access to all creator features on Digis.

What you can do now:
- Go live and earn gifts from fans
- Offer paid 1-on-1 video calls
- Charge for direct messages
- Your AI Twin makes money while you sleep

Complete your profile: https://digis.cc/settings/profile

Your profile: https://digis.cc/${data.username}

Welcome to the creator family!

The Digis Team
  `.trim();

  return await sendEmail({ to: data.email, subject, html, text });
}

/**
 * Add a creator to the Resend "Creators" audience for weekly emails
 */
export async function addCreatorToAudience(data: CreatorApprovalData) {
  if (!resend || !CREATORS_AUDIENCE_ID) {
    console.log('[DEV] Would add to audience:', data.email);
    return { success: true };
  }

  try {
    const { data: contact, error } = await resend.contacts.create({
      email: data.email,
      firstName: data.name.split(' ')[0],
      lastName: data.name.split(' ').slice(1).join(' ') || undefined,
      unsubscribed: false,
      audienceId: CREATORS_AUDIENCE_ID,
    });

    if (error) {
      console.error('Failed to add creator to audience:', error);
      return { success: false, error: error.message };
    }

    console.log('Creator added to audience:', data.email, contact?.id);
    return { success: true, contactId: contact?.id };
  } catch (error) {
    console.error('Error adding to audience:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Remove a creator from the audience (if they're no longer a creator)
 */
export async function removeCreatorFromAudience(email: string) {
  if (!resend || !CREATORS_AUDIENCE_ID) {
    console.log('[DEV] Would remove from audience:', email);
    return { success: true };
  }

  try {
    // First, find the contact by email
    const { data: contacts, error: listError } = await resend.contacts.list({
      audienceId: CREATORS_AUDIENCE_ID,
    });

    if (listError) {
      console.error('Failed to list contacts:', listError);
      return { success: false, error: listError.message };
    }

    const contact = contacts?.data?.find((c: any) => c.email === email);
    if (!contact) {
      console.log('Contact not found in audience:', email);
      return { success: true };
    }

    const { error } = await resend.contacts.remove({
      id: contact.id,
      audienceId: CREATORS_AUDIENCE_ID,
    });

    if (error) {
      console.error('Failed to remove creator from audience:', error);
      return { success: false, error: error.message };
    }

    console.log('Creator removed from audience:', email);
    return { success: true };
  } catch (error) {
    console.error('Error removing from audience:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
