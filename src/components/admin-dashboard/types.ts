export interface Stats {
  totalUsers: number;
  totalCreators: number;
  totalFans: number;
  totalAdmins: number;
  pendingApplications: number;
  pendingPayouts?: number;
  pendingPayoutAmount?: number;
  totalRevenue?: number;
  todaySignups?: number;
  weekSignups?: number;
}

export type MainTab = 'traffic' | 'payouts' | 'moderation' | 'revenue' | 'activity' | 'tools';

export interface TrafficData {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    viewsGrowth: number;
    visitorsGrowth: number;
    lastWeekSignups: number;
    signupsGrowth: number;
  };
  viewsByPageType: Array<{ pageType: string; views: number }>;
  viewsByDevice: Array<{ device: string; views: number }>;
  topPages: Array<{ path: string; views: number }>;
  topCreatorProfiles: Array<{ username: string; views: number }>;
  viewsTimeline: Array<{ date: string; views: number }>;
  combinedTimeline: Array<{ date: string; views: number; signups: number }>;
  range: string;
}

export interface RevenueData {
  revenue: {
    totalCoinsSold: number;
    todayCoinsSold: number;
    weekCoinsSold: number;
    monthCoinsSold: number;
    totalTips: number;
    totalRevenue: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    platformProfit: number;
  };
  leaderboard: {
    topEarners: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreatorVerified: boolean;
      earnings: number;
      followerCount: number;
    }>;
    topFollowed: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreatorVerified: boolean;
      followerCount: number;
    }>;
    mostActive: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isCreatorVerified: boolean;
      lastSeenAt: string | null;
      followerCount: number;
    }>;
    topPurchasers: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      email: string | null;
      totalPurchased: number;
      purchaseCount: number;
    }>;
  };
}

export interface CreatorActivityData {
  summary: {
    totalCreators: number;
    activeToday: number;
    activeThisWeek: number;
    activeThisMonth: number;
    inactive: number;
  };
  creators: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isCreatorVerified: boolean;
    lastSeenAt: string | null;
    followerCount: number;
    createdAt: string;
    activityStatus: 'active_today' | 'active_week' | 'active_month' | 'inactive';
    loginsToday: number;
    loginsThisWeek: number;
    loginsThisMonth: number;
    daysSinceLastSeen: number | null;
  }>;
}

export interface MostBlockedUser {
  blockedId: string;
  blockCount: number;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export interface BlockRecord {
  id: string;
  blockedId: string;
  blockerId: string;
  reason: string | null;
  createdAt: string;
  blocker: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  blocked: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
}

export interface StreamBanRecord {
  id: string;
  streamId: string;
  userId: string;
  bannedBy: string | null;
  reason: string | null;
  createdAt: string;
  bannedUser: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  bannedByUser: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  stream: { id: string; title: string; creatorId: string } | null;
}

export interface ModerationData {
  mostBlockedUsers: MostBlockedUser[];
  recentBlocks: BlockRecord[];
  recentStreamBans: StreamBanRecord[];
  stats: {
    totalBlocks: number;
    totalStreamBans: number;
    usersBlockedByMultiple: number;
  };
}

export type ActivityFilter = 'all' | 'active_today' | 'active_week' | 'active_month' | 'inactive';
export type TrafficRange = '24h' | '7d' | '30d';

export interface PayoutSummary {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payoutMethod: 'bank_transfer' | 'payoneer';
  requestedAt: string;
}

export interface PayoutsData {
  payouts: PayoutSummary[];
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}
