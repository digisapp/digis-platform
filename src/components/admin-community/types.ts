export interface Creator {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_creator_verified: boolean;
  is_hidden_from_discovery: boolean;
  follower_count: number;
  following_count: number;
  last_seen_at: string | null;
  account_status: 'active' | 'suspended' | 'banned';
  created_at: string;
  is_online: boolean;
  primary_category: string | null;
  balance: number;
  total_earned: number;
  content_count: number;
  last_post_at: string | null;
  total_streams: number;
  last_stream_at: string | null;
  active_subscribers: number;
  profile_completeness: number;
  profile_views: number;
  views_7d: number;
  referral_count: number;
}

export interface Fan {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  following_count: number;
  last_seen_at: string | null;
  account_status: 'active' | 'suspended' | 'banned';
  lifetime_spending: number;
  spend_tier: string;
  created_at: string;
  is_online: boolean;
  balance: number;
  total_spent: number;
  block_count: number;
  unique_blockers: number;
  messages_sent: number;
  tips_count: number;
  total_tipped: number;
  last_purchase_at: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ConfirmModal {
  show: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'confirm';
  confirmText: string;
  onConfirm: () => void;
}

export const CREATOR_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'verified', label: 'Verified' },
  { key: 'unverified', label: 'Unverified' },
  { key: 'top_earners', label: 'Top Earners' },
  { key: 'top_referrers', label: 'Top Referrers' },
  { key: 'new', label: 'New (7d)' },
  { key: 'inactive', label: 'Inactive (30d)' },
];

export const FAN_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'top_spenders', label: 'Top Spenders' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'has_balance', label: 'Has Coins' },
  { key: 'new', label: 'New (7d)' },
  { key: 'inactive', label: 'Inactive (30d)' },
];

export interface Application {
  id: string;
  userId: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  phoneNumber: string | null;
  followerCount: number | null;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  red_flags: { type: string; severity: 'danger' | 'warning'; message: string }[];
  account_age_days: number;
}

export interface ApplicationCounts {
  pending: number;
  approved: number;
  rejected: number;
  all: number;
}

export const SEARCH_DEBOUNCE_MS = 300;
export const TOAST_TIMEOUT_MS = 3000;
export const ERROR_TOAST_TIMEOUT_MS = 5000;
export const DEFAULT_PAGE_LIMIT = 50;
