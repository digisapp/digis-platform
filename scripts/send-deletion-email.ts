/**
 * Send account deletion notification email
 * Usage: npx tsx scripts/send-deletion-email.ts <email>
 */

import { Resend } from 'resend';

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/send-deletion-email.ts <email>');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDeletionEmail() {
  try {
    console.log(`Sending deletion notification to: ${email}\n`);

    const { data, error } = await resend.emails.send({
      from: 'Digis <noreply@digis.cc>',
      to: email,
      subject: 'Your Digis Account Has Been Deleted',
      text: `Hello,

Your Digis account has been deleted from our platform.

If you did not request this deletion or believe this was done in error, please contact us at support@digis.cc.

Thank you for being part of our community.

Best regards,
The Digis Team`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 24px; font-weight: bold; color: #7c3aed; }
    .content { padding: 20px 0; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Digis</div>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your Digis account has been deleted from our platform.</p>
      <p>If you did not request this deletion or believe this was done in error, please contact us at <a href="mailto:support@digis.cc">support@digis.cc</a>.</p>
      <p>Thank you for being part of our community.</p>
      <p>Best regards,<br>The Digis Team</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 Digis. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send email:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', data?.id);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

sendDeletionEmail();
