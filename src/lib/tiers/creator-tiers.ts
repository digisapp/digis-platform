/**
 * Creator Tier System
 *
 * Creators earn status tiers based on total lifetime tips received.
 * Higher tiers unlock profile badges and increased visibility.
 */

export type CreatorTier = 'basic' | 'star' | 'elite' | 'crown' | 'icon';

export interface CreatorTierConfig {
  tier: CreatorTier;
  minCoins: number;
  color: string; // Tailwind color class
  bgColor: string; // Background gradient
  displayName: string;
  emoji: string;
}

// Tier thresholds based on lifetime tips received
export const CREATOR_TIER_CONFIGS: CreatorTierConfig[] = [
  {
    tier: 'icon',
    minCoins: 20_000_000, // 20M coins
    color: 'text-rose-400',
    bgColor: 'from-rose-500/20 to-pink-500/20',
    displayName: 'Icon',
    emoji: '🏆',
  },
  {
    tier: 'crown',
    minCoins: 5_000_000, // 5M coins
    color: 'text-amber-400',
    bgColor: 'from-amber-500/20 to-yellow-500/20',
    displayName: 'Crown',
    emoji: '👑',
  },
  {
    tier: 'elite',
    minCoins: 1_000_000, // 1M coins
    color: 'text-cyan-400',
    bgColor: 'from-cyan-500/20 to-blue-500/20',
    displayName: 'Elite',
    emoji: '💎',
  },
  {
    tier: 'star',
    minCoins: 100_000, // 100K coins
    color: 'text-purple-400',
    bgColor: 'from-purple-500/20 to-violet-500/20',
    displayName: 'Star',
    emoji: '🌟',
  },
  {
    tier: 'basic',
    minCoins: 0,
    color: 'text-gray-400',
    bgColor: 'from-gray-500/20 to-slate-500/20',
    displayName: 'Basic',
    emoji: '⭐',
  },
];

/**
 * Calculate creator tier from lifetime tips received
 */
export function calculateCreatorTier(lifetimeTips: number): CreatorTier {
  for (const config of CREATOR_TIER_CONFIGS) {
    if (lifetimeTips >= config.minCoins) {
      return config.tier;
    }
  }
  return 'basic';
}

/**
 * Get tier configuration by tier name
 */
export function getCreatorTierConfig(tier: CreatorTier): CreatorTierConfig {
  return CREATOR_TIER_CONFIGS.find(c => c.tier === tier) || CREATOR_TIER_CONFIGS[CREATOR_TIER_CONFIGS.length - 1];
}

/**
 * Get progress to next tier
 */
export function getCreatorNextTierProgress(lifetimeTips: number): {
  currentTier: CreatorTierConfig;
  nextTier: CreatorTierConfig | null;
  coinsToNext: number;
  progressPercent: number;
} {
  const currentTier = calculateCreatorTier(lifetimeTips);
  const currentConfig = getCreatorTierConfig(currentTier);

  // Find next tier
  const currentIndex = CREATOR_TIER_CONFIGS.findIndex(c => c.tier === currentTier);
  const nextTier = currentIndex > 0 ? CREATOR_TIER_CONFIGS[currentIndex - 1] : null;

  if (!nextTier) {
    return {
      currentTier: currentConfig,
      nextTier: null,
      coinsToNext: 0,
      progressPercent: 100,
    };
  }

  const coinsToNext = nextTier.minCoins - lifetimeTips;
  const tierRange = nextTier.minCoins - currentConfig.minCoins;
  const progressPercent = Math.min(100, ((lifetimeTips - currentConfig.minCoins) / tierRange) * 100);

  return {
    currentTier: currentConfig,
    nextTier,
    coinsToNext,
    progressPercent,
  };
}
