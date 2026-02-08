export interface Analytics {
  overview: {
    totalEarnings: number;
    totalGiftCoins: number;
    totalCallEarnings: number;
    totalStreams: number;
    totalCalls: number;
    totalStreamViews: number;
    peakViewers: number;
  };
  streams: {
    totalStreams: number;
    totalViews: number;
    peakViewers: number;
    averageViewers: number;
  };
  calls: {
    totalCalls: number;
    totalMinutes: number;
    totalEarnings: number;
    averageCallLength: number;
  };
  gifts: {
    totalGifts: number;
    totalCoins: number;
    averageGiftValue: number;
  };
  topGifters: Array<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    totalCoins: number;
    giftCount: number;
  }>;
}

export interface Activity {
  id: string;
  type: 'gift' | 'follow' | 'call' | 'stream' | 'tip' | 'notification' | 'subscribe' | 'order';
  title: string;
  description: string;
  timestamp: string;
  icon: 'gift' | 'userplus' | 'phone' | 'video' | 'coins' | 'heart' | 'package';
  color: string;
  amount?: number;
  action?: {
    label: string;
    orderId: string;
  };
}

export interface ContentItem {
  id: string;
  type: 'video' | 'photo' | 'gallery';
  title: string;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export interface UpcomingEvent {
  id: string;
  type: 'show' | 'call';
  title: string;
  scheduledFor: string;
  details?: string;
}
