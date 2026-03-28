/**
 * AI Email Classifier & Auto-Reply System
 *
 * Uses xAI Grok to classify inbound admin emails and draft contextual replies.
 * Auto-sends replies for safe categories when confidence >= 85%.
 */

import { db } from '@/lib/data/system';
import { adminEmails, platformSettings } from '@/db/schema';
import { sendEmail } from './resend';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

import { XAI_API_URL, XAI_MODEL_FAST } from '@/lib/xai';

const GROK_API_URL = XAI_API_URL;
const GROK_MODEL = XAI_MODEL_FAST;

const INBOUND_ADDRESS = process.env.ADMIN_EMAIL_ADDRESS || 'inbox@inbound.digis.cc';
const ADMIN_FROM = 'Digis <admin@digis.cc>';

const AUTO_SEND_CONFIDENCE_THRESHOLD = 0.85;

const ALL_CATEGORIES = [
  'creator_inquiry',
  'fan_support',
  'payout_question',
  'subscription_issue',
  'content_question',
  'technical_support',
  'partnership',
  'feedback',
  'legal_compliance',
  'spam',
  'other',
] as const;

export type EmailCategory = (typeof ALL_CATEGORIES)[number];

const AUTO_SENDABLE_CATEGORIES: ReadonlySet<EmailCategory> = new Set([
  'creator_inquiry',
  'fan_support',
  'subscription_issue',
  'content_question',
  'technical_support',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InboundEmail {
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  summary: string;
  draftText: string;
  draftHtml: string;
  autoSendable: boolean;
}

// ---------------------------------------------------------------------------
// Branded HTML email template
// ---------------------------------------------------------------------------

export function buildBrandedEmailHtml(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Digis</title>
</head>
<body style="margin:0;padding:0;background-color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111827;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#06b6d4,#8b5cf6);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Digis</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 24px;color:#1f2937;font-size:15px;line-height:1.6;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px;text-align:center;border-radius:0 0 12px 12px;background-color:#1f2937;">
              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
                Digis &mdash; Creator Platform
              </p>
              <p style="margin:0;font-size:12px;color:#6b7280;">
                <a href="mailto:admin@digis.cc" style="color:#06b6d4;text-decoration:none;">admin@digis.cc</a>
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

// ---------------------------------------------------------------------------
// classifyAndDraftReply
// ---------------------------------------------------------------------------

export async function classifyAndDraftReply(
  email: InboundEmail,
): Promise<ClassificationResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is not configured');
  }

  const emailBody = email.text || email.html || '(empty body)';

  const systemPrompt = `You are the AI assistant for Digis, a creator platform (similar to OnlyFans/Patreon) where creators monetize content through live streams, video calls, subscriptions, pay-per-view content, tips, and cloud file sales.

Your job is to classify inbound support emails and draft a helpful, friendly reply on behalf of the Digis team.

CATEGORIES (pick exactly one):
- creator_inquiry: Someone interested in becoming a creator on Digis
- fan_support: A fan/viewer needing help with their account, subscriptions, or payments
- payout_question: A creator asking about payouts, earnings, or Payoneer setup
- subscription_issue: Questions about billing, subscription renewal, or cancellation
- content_question: Questions about content, VODs, clips, cloud storage, or media
- technical_support: Bug reports, errors, or app/website issues
- partnership: Brand deals, collaborations, or business/sponsorship inquiries
- feedback: Compliments, suggestions, or feature requests
- legal_compliance: DMCA takedowns, privacy requests, terms of service, or legal matters
- spam: Junk mail, unsolicited marketing, phishing attempts
- other: Doesn't fit any category above

Respond with valid JSON only. No markdown fences, no extra text. Schema:
{
  "category": "<one of the categories above>",
  "confidence": <number 0-1>,
  "summary": "<1-2 sentence summary of the email>",
  "draftReply": "<plain text draft reply to send to the person>"
}

Guidelines for the draft reply:
- Be warm, professional, and concise
- Sign off as "The Digis Team"
- For creator_inquiry: explain that Digis lets creators earn through subscriptions, tips, live streams, video calls, and content sales; invite them to sign up and complete creator onboarding
- For fan_support: be empathetic, ask clarifying questions if needed, and point them to relevant help
- For subscription_issue: acknowledge the concern, explain the general process, offer to look into their specific case
- For content_question: explain relevant features (VODs, clips, cloud) and how to access them
- For technical_support: acknowledge the issue, ask for details (browser, device, steps to reproduce), and assure them the team is looking into it
- For spam: draft a minimal "no reply needed" response
- For payout_question, partnership, feedback, legal_compliance: draft a thoughtful reply but note these need human review
- Never share internal system details, API keys, or admin information`;

  const userPrompt = `Classify this email and draft a reply:

From: ${email.fromName ? `${email.fromName} <${email.from}>` : email.from}
Subject: ${email.subject}

Body:
${emailBody.substring(0, 4000)}`;

  const response = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';

  // Parse JSON from the response (strip markdown fences if present)
  const jsonStr = content.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed: {
    category: string;
    confidence: number;
    summary: string;
    draftReply: string;
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse Grok response as JSON: ${content.substring(0, 300)}`);
  }

  // Validate category
  const category = ALL_CATEGORIES.includes(parsed.category as EmailCategory)
    ? (parsed.category as EmailCategory)
    : 'other';

  const confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0));
  const summary = parsed.summary || 'No summary available';
  const draftText = parsed.draftReply || '';

  // Build branded HTML version of the draft
  const draftHtml = buildBrandedEmailHtml(
    draftText
      .split('\n')
      .map((line) => (line.trim() === '' ? '<br />' : `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`))
      .join('\n'),
  );

  const autoSendable =
    AUTO_SENDABLE_CATEGORIES.has(category) &&
    confidence >= AUTO_SEND_CONFIDENCE_THRESHOLD;

  return {
    category,
    confidence,
    summary,
    draftText,
    draftHtml,
    autoSendable,
  };
}

// ---------------------------------------------------------------------------
// sendAutoReply
// ---------------------------------------------------------------------------

export async function sendAutoReply(
  inboundEmailId: string,
  classification: ClassificationResult,
  originalEmail: { from: string; fromName?: string; subject: string; threadId?: string | null; messageId?: string | null },
): Promise<{ sent: boolean; reason?: string; outboundId?: string }> {
  // 1. Check if auto-reply is enabled in platform settings
  const setting = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, 'ai_auto_reply_enabled'))
    .then((rows) => rows[0]);

  const autoReplyEnabled = setting?.value === 'true';

  if (!autoReplyEnabled) {
    return { sent: false, reason: 'ai_auto_reply_enabled is not true in platform settings' };
  }

  // 2. Verify this is an auto-sendable category with sufficient confidence
  if (!classification.autoSendable) {
    return {
      sent: false,
      reason: `Category "${classification.category}" is not auto-sendable or confidence ${classification.confidence} < ${AUTO_SEND_CONFIDENCE_THRESHOLD}`,
    };
  }

  // 3. Send the email via Resend
  const replySubject = originalEmail.subject.startsWith('Re:')
    ? originalEmail.subject
    : `Re: ${originalEmail.subject}`;

  const result = await sendEmail({
    to: originalEmail.from,
    subject: replySubject,
    text: classification.draftText,
    html: classification.draftHtml,
    from: ADMIN_FROM,
    replyTo: INBOUND_ADDRESS,
  });

  if (!result.success) {
    return { sent: false, reason: `Email send failed: ${result.error}` };
  }

  // 4. Store the outbound reply in the database
  const [outbound] = await db
    .insert(adminEmails)
    .values({
      direction: 'outbound',
      status: 'sent',
      threadId: originalEmail.threadId ?? undefined,
      resendEmailId: result.id ?? undefined,
      fromAddress: 'admin@digis.cc',
      fromName: 'Digis',
      toAddress: originalEmail.from,
      toName: originalEmail.fromName ?? undefined,
      subject: replySubject,
      bodyText: classification.draftText,
      bodyHtml: classification.draftHtml,
      inReplyToEmailId: inboundEmailId,
      aiCategory: classification.category,
      aiConfidence: classification.confidence,
      aiSummary: `Auto-reply to: ${classification.summary}`,
      aiProcessedAt: new Date(),
    })
    .returning({ id: adminEmails.id });

  // 5. Mark the inbound email as replied
  await db
    .update(adminEmails)
    .set({
      status: 'replied',
      repliedAt: new Date(),
    })
    .where(eq(adminEmails.id, inboundEmailId));

  return { sent: true, outboundId: outbound.id };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
