/**
 * Spend Tier Pure Logic Tests
 *
 * These test the tier calculation logic without any DB dependencies.
 */

import { describe, it, expect } from 'vitest';
import { calculateTier, getTierConfig, getNextTierProgress, TIER_CONFIGS } from '@/lib/tiers/spend-tiers';

describe('calculateTier', () => {
  it('returns "none" for 0 spending', () => {
    expect(calculateTier(0)).toBe('none');
  });

  it('returns "none" for spending below bronze threshold', () => {
    expect(calculateTier(499)).toBe('none');
  });

  it('returns "bronze" at exactly 500 coins', () => {
    expect(calculateTier(500)).toBe('bronze');
  });

  it('returns "silver" at exactly 5000 coins', () => {
    expect(calculateTier(5000)).toBe('silver');
  });

  it('returns "gold" at exactly 10000 coins', () => {
    expect(calculateTier(10000)).toBe('gold');
  });

  it('returns "platinum" at exactly 50000 coins', () => {
    expect(calculateTier(50000)).toBe('platinum');
  });

  it('returns "diamond" at exactly 100000 coins', () => {
    expect(calculateTier(100000)).toBe('diamond');
  });

  it('returns "diamond" for spending above max tier', () => {
    expect(calculateTier(999999)).toBe('diamond');
  });

  it('returns correct tier for values just above thresholds', () => {
    expect(calculateTier(501)).toBe('bronze');
    expect(calculateTier(5001)).toBe('silver');
    expect(calculateTier(10001)).toBe('gold');
    expect(calculateTier(50001)).toBe('platinum');
    expect(calculateTier(100001)).toBe('diamond');
  });

  it('returns previous tier for values just below thresholds', () => {
    expect(calculateTier(4999)).toBe('bronze');
    expect(calculateTier(9999)).toBe('silver');
    expect(calculateTier(49999)).toBe('gold');
    expect(calculateTier(99999)).toBe('platinum');
  });

  it('handles negative spending gracefully', () => {
    // This shouldn't happen in production but should not crash
    expect(calculateTier(-100)).toBe('none');
  });
});

describe('getTierConfig', () => {
  it('returns correct config for each tier', () => {
    expect(getTierConfig('none').minCoins).toBe(0);
    expect(getTierConfig('bronze').minCoins).toBe(500);
    expect(getTierConfig('silver').minCoins).toBe(5000);
    expect(getTierConfig('gold').minCoins).toBe(10000);
    expect(getTierConfig('platinum').minCoins).toBe(50000);
    expect(getTierConfig('diamond').minCoins).toBe(100000);
  });

  it('returns "none" config for unknown tier', () => {
    // @ts-expect-error - testing invalid input
    const config = getTierConfig('invalid');
    expect(config.tier).toBe('none');
  });
});

describe('getNextTierProgress', () => {
  it('returns correct progress for user with no spending', () => {
    const progress = getNextTierProgress(0);
    expect(progress.currentTier.tier).toBe('none');
    expect(progress.nextTier?.tier).toBe('bronze');
    expect(progress.coinsToNext).toBe(500);
    expect(progress.progressPercent).toBe(0);
  });

  it('returns correct progress for user at 50% to bronze', () => {
    const progress = getNextTierProgress(250);
    expect(progress.currentTier.tier).toBe('none');
    expect(progress.nextTier?.tier).toBe('bronze');
    expect(progress.coinsToNext).toBe(250);
    expect(progress.progressPercent).toBe(50);
  });

  it('returns 100% progress with no next tier for diamond', () => {
    const progress = getNextTierProgress(150000);
    expect(progress.currentTier.tier).toBe('diamond');
    expect(progress.nextTier).toBeNull();
    expect(progress.coinsToNext).toBe(0);
    expect(progress.progressPercent).toBe(100);
  });

  it('caps progress at 100%', () => {
    // If someone is somehow over the threshold, don't show >100%
    const progress = getNextTierProgress(999999);
    expect(progress.progressPercent).toBeLessThanOrEqual(100);
  });
});

describe('TIER_CONFIGS ordering', () => {
  it('has tiers in descending order by minCoins', () => {
    for (let i = 0; i < TIER_CONFIGS.length - 1; i++) {
      expect(TIER_CONFIGS[i].minCoins).toBeGreaterThan(TIER_CONFIGS[i + 1].minCoins);
    }
  });

  it('has exactly 6 tiers', () => {
    expect(TIER_CONFIGS).toHaveLength(6);
  });

  it('ends with "none" tier at 0 coins', () => {
    const lastTier = TIER_CONFIGS[TIER_CONFIGS.length - 1];
    expect(lastTier.tier).toBe('none');
    expect(lastTier.minCoins).toBe(0);
  });
});
