import { Resend } from 'resend';

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('⚠️ RESEND_API_KEY not configured - emails will be logged but not sent');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Default sender
const DEFAULT_FROM = 'Digis <noreply@digis.cc>';

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail({ to, subject, text, html, from = DEFAULT_FROM }: SendEmailOptions) {
  // If Resend is not configured, log and return success (for development)
  if (!resend) {
    console.log('📧 [DEV] Email would be sent:', {
      to,
      subject,
      text: text?.substring(0, 100) + '...',
    });
    return { success: true, id: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text: text || '',
      ...(html && { html }),
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }

    console.log('📧 Email sent successfully:', { to, subject, id: data?.id });
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for direct access if needed
export { resend };
