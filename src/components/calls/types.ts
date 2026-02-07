export interface CallToken {
  token: string;
  roomName: string;
  participantName: string;
  wsUrl: string;
}

export interface CallData {
  id: string;
  status: string;
  callType: 'video' | 'voice';
  ratePerMinute: number;
  fanId: string;
  creatorId: string;
  fan: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface VirtualGift {
  id: string;
  name: string;
  emoji: string;
  coinCost: number;
  rarity: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderName?: string;
  content: string;
  timestamp: number;
  type?: 'chat' | 'tip' | 'gift';
  amount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftRarity?: string;
}
