export interface EmailListItem {
  id: string;
  direction: 'inbound' | 'outbound';
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
}

export interface EmailDetail {
  id: string;
  direction: 'inbound' | 'outbound';
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
}
