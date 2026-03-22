import { pgTable, uuid, text, timestamp, pgEnum, boolean, index, real } from 'drizzle-orm/pg-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const emailDirectionEnum = pgEnum('email_direction', ['inbound', 'outbound']);

export const emailStatusEnum = pgEnum('email_status', [
  'received', 'read', 'replied', 'sent', 'delivered', 'bounced', 'failed',
]);

// Admin email inbox
export const adminEmails = pgTable('admin_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  direction: emailDirectionEnum('direction').notNull(),
  status: emailStatusEnum('status').default('received').notNull(),
  threadId: text('thread_id'), // Groups related emails into threads
  resendEmailId: text('resend_email_id'), // Resend's email ID for tracking
  messageId: text('message_id'), // Email Message-ID header
  fromAddress: text('from_address').notNull(),
  fromName: text('from_name'),
  toAddress: text('to_address').notNull(),
  toName: text('to_name'),
  subject: text('subject').notNull(),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  isRead: boolean('is_read').default(false).notNull(),
  isSpam: boolean('is_spam').default(false).notNull(),
  isStarred: boolean('is_starred').default(false).notNull(),
  linkedUserId: uuid('linked_user_id').references(() => users.id, { onDelete: 'set null' }),
  inReplyToEmailId: uuid('in_reply_to_email_id'), // Self-reference for threading
  metadata: text('metadata'), // JSON string for CC, BCC, extra headers
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
  // AI fields
  aiCategory: text('ai_category'),
  aiConfidence: real('ai_confidence'),
  aiSummary: text('ai_summary'),
  aiDraftText: text('ai_draft_text'),
  aiDraftHtml: text('ai_draft_html'),
  aiProcessedAt: timestamp('ai_processed_at'),
}, (table) => ({
  directionIdx: index('admin_emails_direction_idx').on(table.direction),
  statusIdx: index('admin_emails_status_idx').on(table.status),
  threadIdx: index('admin_emails_thread_idx').on(table.threadId),
  isReadIdx: index('admin_emails_is_read_idx').on(table.isRead, table.direction),
  linkedUserIdx: index('admin_emails_linked_user_idx').on(table.linkedUserId),
  createdAtIdx: index('admin_emails_created_at_idx').on(table.createdAt),
  fromAddressIdx: index('admin_emails_from_address_idx').on(table.fromAddress),
  resendEmailIdIdx: index('admin_emails_resend_email_id_idx').on(table.resendEmailId),
}));

// Relations
export const adminEmailsRelations = relations(adminEmails, ({ one }) => ({
  linkedUser: one(users, {
    fields: [adminEmails.linkedUserId],
    references: [users.id],
  }),
}));

// Platform settings (key-value store for admin toggles)
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull().default('true'), // JSON string
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type AdminEmail = typeof adminEmails.$inferSelect;
export type NewAdminEmail = typeof adminEmails.$inferInsert;
export type PlatformSetting = typeof platformSettings.$inferSelect;
