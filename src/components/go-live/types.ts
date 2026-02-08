export interface FeaturedCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ActiveStream {
  id: string;
  title: string;
  currentViewers: number;
  startedAt: string;
}

export const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers Only' },
  { value: 'subscribers', label: 'Subscribers Only' },
] as const;

export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
};
