import { db } from '@/lib/data/system';
import { vods, vodPurchases, subscriptions } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

/**
 * Check if a user has access to watch a VOD
 */
export async function hasVODAccess({
  vodId,
  userId,
}: {
  vodId: string;
  userId: string | null;
}): Promise<{
  hasAccess: boolean;
  reason?: string;
  requiresPurchase?: boolean;
  price?: number;
}> {
  try {
    // Get VOD details
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return { hasAccess: false, reason: 'VOD not found' };
    }

    // Creator always has access
    if (userId && vod.creatorId === userId) {
      return { hasAccess: true, reason: 'Creator access' };
    }

    // Public VODs are free for everyone
    if (vod.isPublic) {
      return { hasAccess: true, reason: 'Public VOD' };
    }

    // Must be logged in for non-public VODs
    if (!userId) {
      return {
        hasAccess: false,
        reason: 'Login required',
        requiresPurchase: true,
        price: vod.priceCoins,
      };
    }

    // Check if user has purchased access
    const purchase = await db.query.vodPurchases.findFirst({
      where: and(
        eq(vodPurchases.vodId, vodId),
        eq(vodPurchases.userId, userId)
      ),
    });

    if (purchase) {
      return { hasAccess: true, reason: 'Purchased access' };
    }

    // Check if VOD is subscribers-only and user is subscribed
    if (vod.subscribersOnly) {
      const subscription = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.creatorId, vod.creatorId),
          eq(subscriptions.status, 'active')
        ),
      });

      if (subscription) {
        return { hasAccess: true, reason: 'Subscriber access' };
      }

      // Not a subscriber but VOD is subscribers-only
      return {
        hasAccess: false,
        reason: 'Subscribers only',
        requiresPurchase: true,
        price: vod.priceCoins,
      };
    }

    // VOD requires purchase
    return {
      hasAccess: false,
      reason: 'Purchase required',
      requiresPurchase: true,
      price: vod.priceCoins,
    };
  } catch (error) {
    console.error('[hasVODAccess] Error:', error);
    return { hasAccess: false, reason: 'Error checking access' };
  }
}

/**
 * Record a VOD purchase
 */
export async function purchaseVODAccess({
  vodId,
  userId,
}: {
  vodId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return { success: false, error: 'VOD not found' };
    }

    // Check if already purchased
    const existingPurchase = await db.query.vodPurchases.findFirst({
      where: and(
        eq(vodPurchases.vodId, vodId),
        eq(vodPurchases.userId, userId)
      ),
    });

    if (existingPurchase) {
      return { success: false, error: 'Already purchased' };
    }

    // Create purchase record
    await db.insert(vodPurchases).values({
      vodId,
      userId,
      priceCoins: vod.priceCoins,
    });

    // Update VOD stats
    await db
      .update(vods)
      .set({
        purchaseCount: vod.purchaseCount + 1,
        totalEarnings: vod.totalEarnings + vod.priceCoins,
      })
      .where(eq(vods.id, vodId));

    return { success: true };
  } catch (error) {
    console.error('[purchaseVODAccess] Error:', error);
    return { success: false, error: 'Failed to purchase access' };
  }
}
