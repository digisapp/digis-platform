/**
 * Global Lifetime Spend Tier System
 *
 * Fans earn colored username badges based on total lifetime spending across the platform.
 * This provides instant visual credibility in live chats so creators know who to engage with.
 */

export type SpendTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierConfig {
  tier: SpendTier;
  minCoins: number;
  color: string; // Tailwind color class
  displayName: string;
  emoji: string;
}

// Tier thresholds based on lifetime spending
export const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'diamond',
    minCoins: 1_000_000, // $10,000
    color: 'text-cyan-400',
    displayName: 'Diamond',
    emoji: '👑',
  },
  {
    tier: 'platinum',
    minCoins: 500_000, // $5,000
    color: 'text-purple-400',
    displayName: 'Platinum',
    emoji: '💎',
  },
  {
    tier: 'gold',
    minCoins: 100_000, // $1,000
    color: 'text-yellow-400',
    displayName: 'Gold',
    emoji: '🥇',
  },
  {
    tier: 'silver',
    minCoins: 50_000, // $500
    color: 'text-gray-300',
    displayName: 'Silver',
    emoji: '🥈',
  },
  {
    tier: 'bronze',
    minCoins: 5_000, // $50
    color: 'text-orange-400',
    displayName: 'Bronze',
    emoji: '🥉',
  },
  {
    tier: 'none',
    minCoins: 0,
    color: 'text-gray-500',
    displayName: 'No Tier',
    emoji: '',
  },
];

/**
 * Calculate tier from lifetime spending amount
 */
export function calculateTier(lifetimeSpending: number): SpendTier {
  // Iterate from highest to lowest tier
  for (const config of TIER_CONFIGS) {
    if (lifetimeSpending >= config.minCoins) {
      return config.tier;
    }
  }
  return 'none';
}

/**
 * Get tier configuration by tier name
 */
export function getTierConfig(tier: SpendTier): TierConfig {
  return TIER_CONFIGS.find(c => c.tier === tier) || TIER_CONFIGS[TIER_CONFIGS.length - 1];
}

/**
 * Get username color class for a tier
 */
export function getTierColor(tier: SpendTier): string {
  return getTierConfig(tier).color;
}

/**
 * Get progress to next tier
 */
export function getNextTierProgress(lifetimeSpending: number): {
  currentTier: TierConfig;
  nextTier: TierConfig | null;
  coinsToNext: number;
  progressPercent: number;
} {
  const currentTier = calculateTier(lifetimeSpending);
  const currentConfig = getTierConfig(currentTier);

  // Find next tier
  const currentIndex = TIER_CONFIGS.findIndex(c => c.tier === currentTier);
  const nextTier = currentIndex > 0 ? TIER_CONFIGS[currentIndex - 1] : null;

  if (!nextTier) {
    return {
      currentTier: currentConfig,
      nextTier: null,
      coinsToNext: 0,
      progressPercent: 100,
    };
  }

  const coinsToNext = nextTier.minCoins - lifetimeSpending;
  const tierRange = nextTier.minCoins - currentConfig.minCoins;
  const progressPercent = Math.min(100, ((lifetimeSpending - currentConfig.minCoins) / tierRange) * 100);

  return {
    currentTier: currentConfig,
    nextTier,
    coinsToNext,
    progressPercent,
  };
}
