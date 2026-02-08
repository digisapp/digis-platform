export interface ProfileData {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    role: string;
    isCreatorVerified: boolean;
    isOnline: boolean;
    followerCount: number;
    followingCount: number;
    createdAt: string;
  };
  followCounts: {
    followers: number;
    following: number;
  };
  isFollowing: boolean;
  callSettings?: {
    callRatePerMinute: number;
    minimumCallDuration: number;
    isAvailableForCalls: boolean;
    voiceCallRatePerMinute: number;
    minimumVoiceCallDuration: number;
    isAvailableForVoiceCalls: boolean;
  };
  messageRate?: number;
  socialLinks?: {
    instagram?: string | null;
    tiktok?: string | null;
    twitter?: string | null;
    snapchat?: string | null;
    youtube?: string | null;
  } | null;
  links?: {
    id: string;
    title: string;
    url: string;
    emoji: string | null;
  }[] | null;
}

export interface ContentItem {
  id: string;
  type: 'photo' | 'video';
  title: string;
  thumbnail: string;
  url: string;
  description: string;
  likes: number;
  isLiked: boolean;
  views: number;
  isLocked: boolean;
  unlockPrice: number;
  isFree: boolean;
  timestamp: string;
  featured: boolean;
}

export interface StreamItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  peakViewers?: number;
  totalViews?: number;
  endedAt?: string;
  startedAt?: string;
  duration?: number;
  priceCoins?: number;
  isPublic?: boolean;
  isVod: boolean;
  isTicketed: boolean;
  isLocked?: boolean;
  hasAccess?: boolean;
  recordingType?: string;
  sortDate: Date;
  // Ticketed show fields
  ticketPrice?: number;
  ticketsSold?: number;
  maxTickets?: number;
  scheduledStart?: string;
  status?: string;
  showType?: string;
}

export interface ClipItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  likeCount: number;
}

export interface ContentToUnlock {
  id: string;
  title: string;
  type: 'photo' | 'video';
  unlockPrice: number;
  thumbnail: string;
  creatorName: string;
}

export interface TipSuccessGift {
  emoji: string;
  name: string;
}

export interface InsufficientFundsDetails {
  available: number;
  total: number;
  held: number;
}
