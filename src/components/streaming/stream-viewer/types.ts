import type { Stream, StreamGoal, VirtualGift, StreamGift } from '@/db/schema';

export type StreamWithCreator = Stream & {
  creator?: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl?: string | null;
  };
  orientation?: 'landscape' | 'portrait';
};

export type FeaturedCreator = {
  id: string;
  creatorId: string;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  isSpotlighted: boolean;
  tipsReceived: number;
};

export type CreatorCallSettings = {
  callRatePerMinute: number;
  minimumCallDuration: number;
  voiceCallRatePerMinute: number;
  minimumVoiceCallDuration: number;
  isAvailableForCalls: boolean;
  isAvailableForVoiceCalls: boolean;
};

export type AccessDenied = {
  reason: string;
  creatorId?: string;
  creatorUsername?: string;
  requiresSubscription?: boolean;
  requiresFollow?: boolean;
  requiresTicket?: boolean;
  ticketPrice?: number;
};

export type ActivePoll = {
  id: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  endsAt: string;
  isActive: boolean;
};

export type ActiveCountdown = {
  id: string;
  label: string;
  endsAt: string;
  isActive: boolean;
};

export type ActiveGuest = {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestType: 'video' | 'voice';
};

export type GuestInviteData = {
  inviteId: string;
  viewerId: string;
  inviteType: 'video' | 'voice';
  host: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  streamTitle: string;
};

export type GiftAnimation = {
  gift: VirtualGift;
  streamGift: StreamGift;
};

export type FloatingGift = {
  id: string;
  emoji: string;
  rarity: string;
  timestamp: number;
};
