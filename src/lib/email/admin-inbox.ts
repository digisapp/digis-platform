import { db } from '@/lib/data/system';
import { adminEmails, users, platformSettings } from '@/db/schema';
import { eq, desc, and, or, ilike, count, inArray } from 'drizzle-orm';
import { sendEmail } from './resend';
import { v4 as uuidv4 } from 'uuid';

// Inbound address — where replies go (subdomain to preserve Gmail MX on main domain)
const INBOUND_ADDRESS = process.env.ADMIN_EMAIL_ADDRESS || 'inbox@inbound.digis.cc';
// Outbound sender — uses verified main domain for DKIM/SPF
const ADMIN_FROM = 'Digis <admin@digis.cc>';
const ADMIN_FROM_ADDRESS = 'admin@digis.cc';

// ── Spam Filter ──

const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|lottery|prince|inheritance)\b/i,
  /\b(unsubscribe.*click here|act now|limited time|free money)\b/i,
  /\b(bitcoin.*invest|crypto.*guaranteed|guaranteed return)\b/i,
  /\b(nigerian|wire transfer|western union)\b/i,
];

const SPAM_TLDS = ['.xyz', '.top', '.click', '.bid', '.win', '.loan', '.buzz', '.icu'];

export function isLikelySpam(email: { from: string; subject: string; text?: string }): boolean {
  const content = `${email.subject} ${email.text || ''}`;
  const matchCount = SPAM_PATTERNS.filter(p => p.test(content)).length;
  const fromDomain = email.from.split('@')[1]?.toLowerCase() || '';
  const isSpamTLD = SPAM_TLDS.some(tld => fromDomain.endsWith(tld));
  return matchCount >= 2 || isSpamTLD;
}

// ── Service ──

export const AdminInboxService = {
  async listEmails({
    direction,
    search,
    page = 1,
    limit = 20,
    unreadOnly = false,
    includeSpam = false,
  }: {
    direction?: 'inbound' | 'outbound';
    search?: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    includeSpam?: boolean;
  }) {
    const conditions = [];

    if (direction) {
      conditions.push(eq(adminEmails.direction, direction));
    }
    if (unreadOnly) {
      conditions.push(eq(adminEmails.isRead, false));
    }
    if (!includeSpam) {
      conditions.push(eq(adminEmails.isSpam, false));
    }
    if (search) {
      conditions.push(
        or(
          ilike(adminEmails.subject, `%${search}%`),
          ilike(adminEmails.fromAddress, `%${search}%`),
          ilike(adminEmails.toAddress, `%${search}%`),
          ilike(adminEmails.fromName, `%${search}%`),
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [emailsResult, countResult] = await Promise.all([
      db
        .select({
          id: adminEmails.id,
          direction: adminEmails.direction,
          threadId: adminEmails.threadId,
          fromAddress: adminEmails.fromAddress,
          fromName: adminEmails.fromName,
          toAddress: adminEmails.toAddress,
          toName: adminEmails.toName,
          subject: adminEmails.subject,
          bodyText: adminEmails.bodyText,
          isRead: adminEmails.isRead,
          isSpam: adminEmails.isSpam,
          isStarred: adminEmails.isStarred,
          linkedUserId: adminEmails.linkedUserId,
          status: adminEmails.status,
          aiCategory: adminEmails.aiCategory,
          aiConfidence: adminEmails.aiConfidence,
          aiSummary: adminEmails.aiSummary,
          createdAt: adminEmails.createdAt,
        })
        .from(adminEmails)
        .where(where)
        .orderBy(desc(adminEmails.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(adminEmails).where(where),
    ]);

    return {
      emails: emailsResult,
      total: countResult[0]?.value ?? 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.value ?? 0) / limit),
    };
  },

  async getEmail(id: string) {
    const [email] = await db
      .select()
      .from(adminEmails)
      .where(eq(adminEmails.id, id))
      .limit(1);
    return email || null;
  },

  async getThread(threadId: string) {
    return db
      .select()
      .from(adminEmails)
      .where(eq(adminEmails.threadId, threadId))
      .orderBy(adminEmails.createdAt);
  },

  async markRead(id: string, isRead: boolean) {
    const updates: Record<string, unknown> = { isRead };
    if (isRead) {
      updates.readAt = new Date();
      // Only set status to 'read' if currently 'received'
      const [email] = await db
        .select({ status: adminEmails.status })
        .from(adminEmails)
        .where(eq(adminEmails.id, id))
        .limit(1);
      if (email?.status === 'received') {
        updates.status = 'read';
      }
    }
    await db.update(adminEmails).set(updates).where(eq(adminEmails.id, id));
  },

  async markThreadRead(threadId: string) {
    await db
      .update(adminEmails)
      .set({ isRead: true })
      .where(and(eq(adminEmails.threadId, threadId), eq(adminEmails.isRead, false)));
  },

  async bulkMarkRead(ids: string[]) {
    await db
      .update(adminEmails)
      .set({ isRead: true, readAt: new Date(), status: 'read' })
      .where(inArray(adminEmails.id, ids));
  },

  async bulkDelete(ids: string[]) {
    // Clear inReplyToEmailId references first to avoid FK constraint issues
    await db
      .update(adminEmails)
      .set({ inReplyToEmailId: null })
      .where(inArray(adminEmails.inReplyToEmailId, ids));
    await db.delete(adminEmails).where(inArray(adminEmails.id, ids));
  },

  async setStar(id: string, isStarred: boolean) {
    await db.update(adminEmails).set({ isStarred }).where(eq(adminEmails.id, id));
  },

  async getUnreadCount() {
    const [result] = await db
      .select({ value: count() })
      .from(adminEmails)
      .where(
        and(
          eq(adminEmails.direction, 'inbound'),
          eq(adminEmails.isRead, false),
          eq(adminEmails.isSpam, false),
        )
      );
    return result?.value ?? 0;
  },

  async sendNewEmail({
    to,
    subject,
    bodyHtml,
    bodyText,
    replyToEmailId,
  }: {
    to: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    replyToEmailId?: string;
  }) {
    let threadId: string | null = null;
    let inReplyToEmailId: string | null = null;
    let headers: Record<string, string> = {};

    // If replying, copy thread info
    if (replyToEmailId) {
      const [originalEmail] = await db
        .select()
        .from(adminEmails)
        .where(eq(adminEmails.id, replyToEmailId))
        .limit(1);

      if (originalEmail) {
        threadId = originalEmail.threadId;
        inReplyToEmailId = originalEmail.id;

        if (originalEmail.messageId) {
          headers = {
            'In-Reply-To': originalEmail.messageId,
            'References': originalEmail.messageId,
          };
        }
      }
    }

    if (!threadId) {
      threadId = uuidv4();
    }

    // Send via Resend — from verified domain, reply-to inbound subdomain
    const result = await sendEmail({
      to,
      subject,
      text: bodyText,
      html: bodyHtml,
      from: ADMIN_FROM,
      replyTo: INBOUND_ADDRESS,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Store outbound email
    const [stored] = await db
      .insert(adminEmails)
      .values({
        direction: 'outbound',
        threadId,
        resendEmailId: result.id || null,
        fromAddress: ADMIN_FROM_ADDRESS,
        fromName: 'Digis',
        toAddress: to,
        subject,
        bodyText,
        bodyHtml,
        isRead: true, // Outbound are always "read"
        status: 'sent',
        inReplyToEmailId,
        metadata: Object.keys(headers).length > 0 ? JSON.stringify({ headers }) : null,
      })
      .returning();

    // Mark the original email as replied
    if (replyToEmailId) {
      await this.markReplied(replyToEmailId);
    }

    return { success: true, id: stored?.id, resendId: result.id };
  },

  async storeInboundEmail({
    from,
    fromName,
    to,
    subject,
    text,
    html,
    messageId,
    inReplyToHeader,
  }: {
    from: string;
    fromName?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    messageId?: string;
    inReplyToHeader?: string;
  }) {
    const spam = isLikelySpam({ from, subject, text });

    // Try to find thread by In-Reply-To header
    let threadId: string | null = null;
    let inReplyToEmailId: string | null = null;

    if (inReplyToHeader) {
      // Look up by messageId in our DB
      const [relatedEmail] = await db
        .select({ id: adminEmails.id, threadId: adminEmails.threadId })
        .from(adminEmails)
        .where(eq(adminEmails.messageId, inReplyToHeader))
        .limit(1);

      if (relatedEmail) {
        threadId = relatedEmail.threadId;
        inReplyToEmailId = relatedEmail.id;
      }
    }

    // If no thread found, try matching by subject (Re: prefix) + from address
    if (!threadId && subject) {
      const cleanSubject = subject.replace(/^(Re|Fwd|Fw):\s*/gi, '').trim();
      if (cleanSubject !== subject.trim()) {
        const [relatedEmail] = await db
          .select({ id: adminEmails.id, threadId: adminEmails.threadId })
          .from(adminEmails)
          .where(
            and(
              eq(adminEmails.subject, cleanSubject),
              or(
                eq(adminEmails.toAddress, from),
                eq(adminEmails.fromAddress, from),
              ),
            )
          )
          .orderBy(desc(adminEmails.createdAt))
          .limit(1);

        if (relatedEmail) {
          threadId = relatedEmail.threadId;
          inReplyToEmailId = relatedEmail.id;
        }
      }
    }

    if (!threadId) {
      threadId = uuidv4();
    }

    // Try to link to a Digis user by email
    let linkedUserId: string | null = null;
    const [matchedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, from.toLowerCase()))
      .limit(1);
    if (matchedUser) {
      linkedUserId = matchedUser.id;
    }

    const [stored] = await db
      .insert(adminEmails)
      .values({
        direction: 'inbound',
        threadId,
        messageId: messageId || null,
        fromAddress: from,
        fromName: fromName || null,
        toAddress: to,
        subject,
        bodyText: text || null,
        bodyHtml: html || null,
        isRead: false,
        status: 'received',
        isSpam: spam,
        linkedUserId,
        inReplyToEmailId,
      })
      .returning();

    return stored;
  },

  async markSpam(id: string, isSpam: boolean) {
    await db.update(adminEmails).set({ isSpam }).where(eq(adminEmails.id, id));
  },

  async deleteEmail(id: string) {
    await db.delete(adminEmails).where(eq(adminEmails.id, id));
  },

  async markReplied(id: string) {
    await db
      .update(adminEmails)
      .set({ status: 'replied', repliedAt: new Date() })
      .where(eq(adminEmails.id, id));
  },

  async updateDeliveryStatus(
    resendEmailId: string,
    status: 'delivered' | 'bounced' | 'failed',
  ) {
    await db
      .update(adminEmails)
      .set({ status })
      .where(eq(adminEmails.resendEmailId, resendEmailId));
  },

  async updateAiFields(
    id: string,
    fields: {
      aiCategory?: string;
      aiConfidence?: number;
      aiSummary?: string;
      aiDraftText?: string;
      aiDraftHtml?: string;
    },
  ) {
    await db
      .update(adminEmails)
      .set({
        ...fields,
        aiProcessedAt: new Date(),
      })
      .where(eq(adminEmails.id, id));
  },

  async getSettings(key: string) {
    const [row] = await db
      .select({ value: platformSettings.value })
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);
    return row?.value ?? null;
  },

  async setSettings(key: string, value: string) {
    await db
      .insert(platformSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: new Date() },
      });
  },
};
