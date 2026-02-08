export interface StreamData {
  id: string;
  title: string;
  status: string;
  currentViewers: number;
  peakViewers: number;
  totalGiftsReceived: number;
  creatorId: string;
  tipMenuEnabled?: boolean;
}

export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  message: string;
  messageType: 'chat' | 'tip' | 'gift' | 'system' | 'super_tip' | 'ticket_purchase' | 'menu_purchase';
  giftId?: string;
  giftAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  tipMessage?: string;
  createdAt: Date;
  user?: {
    avatarUrl?: string;
    spendTier?: number;
  };
}

export interface StreamGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  rewardText: string;
  isActive: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  endsAt: string;
  isActive: boolean;
}

export interface Countdown {
  id: string;
  label: string;
  endsAt: string;
  isActive: boolean;
}

export type TabType = 'chat' | 'controls' | 'stats';
