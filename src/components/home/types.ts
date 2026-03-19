export interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isCreatorVerified: boolean;
  isOnline?: boolean;
  isLive?: boolean;
  liveStreamId?: string | null;
  primaryCategory?: string | null;
  followerCount?: number;
  createdAt?: string;
}

export interface Stream {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  currentViewers: number;
  startedAt: string;
  category: string | null;
  creator: Creator;
}

export interface HomepageData {
  liveStreams: Stream[];
  followedCreators: (Creator & { isLive: boolean })[];
  discoverCreators: Creator[];
}
