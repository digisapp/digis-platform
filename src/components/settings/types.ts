export interface UsernameStatus {
  canChange: boolean;
  daysRemaining: number;
  changesUsed: number;
  changesRemaining: number;
  maxChanges: number;
  currentUsername: string;
  lastChangedAt: string | null;
}

export interface CreatorLink {
  id: string;
  title: string;
  url: string;
  emoji: string | null;
  isActive: boolean;
  displayOrder: number;
}

// Common emojis for link buttons
export const LINK_EMOJI_OPTIONS = ['🛍️', '💄', '👗', '📸', '🎁', '💰', '🔗', '✨', '💅', '👠', '🎵', '📱', '💻', '🎮', '📚', '🪽'];
