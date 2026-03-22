export type EmailStatus = 'received' | 'read' | 'replied' | 'sent' | 'delivered' | 'bounced' | 'failed';

export interface EmailListItem {
  id: string;
  direction: 'inbound' | 'outbound';
  status: EmailStatus;
  threadId: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string | null;
  isRead: boolean;
  isSpam: boolean;
  isStarred: boolean;
  linkedUserId: string | null;
  createdAt: string;
  // AI fields
  aiCategory: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
}

export interface EmailDetail {
  id: string;
  direction: 'inbound' | 'outbound';
  status: EmailStatus;
  threadId: string | null;
  resendEmailId: string | null;
  messageId: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  isRead: boolean;
  isSpam: boolean;
  isStarred: boolean;
  linkedUserId: string | null;
  inReplyToEmailId: string | null;
  metadata: string | null;
  createdAt: string;
  readAt: string | null;
  repliedAt: string | null;
  // AI fields
  aiCategory: string | null;
  aiConfidence: number | null;
  aiSummary: string | null;
  aiDraftText: string | null;
  aiDraftHtml: string | null;
  aiProcessedAt: string | null;
}

export const AI_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  creator_inquiry: { label: 'Creator', color: 'cyan' },
  fan_support: { label: 'Fan Support', color: 'blue' },
  payout_question: { label: 'Payout', color: 'green' },
  subscription_issue: { label: 'Subscription', color: 'yellow' },
  content_question: { label: 'Content', color: 'purple' },
  technical_support: { label: 'Tech Support', color: 'orange' },
  partnership: { label: 'Partnership', color: 'pink' },
  feedback: { label: 'Feedback', color: 'indigo' },
  legal_compliance: { label: 'Legal', color: 'red' },
  spam: { label: 'Spam', color: 'gray' },
  other: { label: 'Other', color: 'gray' },
};

export const STATUS_LABELS: Record<EmailStatus, { label: string; color: string }> = {
  received: { label: 'Received', color: 'cyan' },
  read: { label: 'Read', color: 'gray' },
  replied: { label: 'Replied', color: 'green' },
  sent: { label: 'Sent', color: 'blue' },
  delivered: { label: 'Delivered', color: 'green' },
  bounced: { label: 'Bounced', color: 'red' },
  failed: { label: 'Failed', color: 'red' },
};
