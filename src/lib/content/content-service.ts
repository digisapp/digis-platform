import { db } from '@/db';
import { contentItems, contentPurchases, users } from '@/db/schema';
import { WalletService } from '@/lib/wallet/wallet-service';
import { eq, and, desc, sql } from 'drizzle-orm';

export type ContentType = 'photo' | 'video' | 'gallery';

interface CreateContentParams {
  creatorId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  unlockPrice: number;
  thumbnailUrl: string;
  mediaUrl: string;
  durationSeconds?: number;
}

interface PurchaseResult {
  success: boolean;
  purchase?: any;
  error?: string;
}

export class ContentService {
  /**
   * Create new content item
   */
  static async createContent(params: CreateContentParams) {
    const {
      creatorId,
      title,
      description,
      contentType,
      unlockPrice,
      thumbnailUrl,
      mediaUrl,
      durationSeconds,
    } = params;

    const [content] = await db
      .insert(contentItems)
      .values({
        creatorId,
        title,
        description,
        contentType,
        unlockPrice: Math.max(0, unlockPrice), // Ensure non-negative
        isFree: unlockPrice === 0,
        thumbnailUrl,
        mediaUrl,
        durationSeconds,
        isPublished: true,
      })
      .returning();

    return content;
  }

  /**
   * Purchase content
   */
  static async purchaseContent(userId: string, contentId: string): Promise<PurchaseResult> {
    return await db.transaction(async (tx) => {
      // Get content details
      const content = await tx.query.contentItems.findFirst({
        where: eq(contentItems.id, contentId),
      });

      if (!content) {
        return { success: false, error: 'Content not found' };
      }

      if (!content.isPublished) {
        return { success: false, error: 'Content is not available' };
      }

      // Check if user is the creator (creators get free access)
      if (content.creatorId === userId) {
        return { success: true, purchase: null, error: 'Creator has automatic access' };
      }

      // Check if already purchased
      const existingPurchase = await tx.query.contentPurchases.findFirst({
        where: and(
          eq(contentPurchases.contentId, contentId),
          eq(contentPurchases.userId, userId)
        ),
      });

      if (existingPurchase) {
        return { success: false, error: 'Already purchased' };
      }

      // Check if free
      if (content.isFree || content.unlockPrice === 0) {
        const [purchase] = await tx
          .insert(contentPurchases)
          .values({
            contentId,
            userId,
            coinsSpent: 0,
          })
          .returning();

        return { success: true, purchase };
      }

      // Check user balance
      const availableBalance = await WalletService.getAvailableBalance(userId);
      if (availableBalance < content.unlockPrice) {
        return {
          success: false,
          error: `Insufficient balance. Need ${content.unlockPrice} coins, have ${availableBalance}`,
        };
      }

      // Deduct coins from buyer
      const debitTx = await WalletService.createTransaction({
        userId,
        amount: -content.unlockPrice,
        type: 'ppv_unlock',
        description: `Unlocked "${content.title}"`,
        metadata: { contentId, creatorId: content.creatorId },
        idempotencyKey: `purchase_${userId}_${contentId}`,
      });

      // Credit coins to creator
      const creditTx = await WalletService.createTransaction({
        userId: content.creatorId,
        amount: content.unlockPrice,
        type: 'creator_payout',
        description: `Sale: "${content.title}"`,
        metadata: { contentId, buyerId: userId },
        idempotencyKey: `sale_${content.creatorId}_${contentId}_${userId}`,
      });

      // Create purchase record
      const [purchase] = await tx
        .insert(contentPurchases)
        .values({
          contentId,
          userId,
          coinsSpent: content.unlockPrice,
          transactionId: debitTx.id,
        })
        .returning();

      // Update content stats
      await tx
        .update(contentItems)
        .set({
          purchaseCount: sql`${contentItems.purchaseCount} + 1`,
          totalEarnings: sql`${contentItems.totalEarnings} + ${content.unlockPrice}`,
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, contentId));

      return { success: true, purchase };
    });
  }

  /**
   * Check if user has access to content
   */
  static async hasAccess(userId: string, contentId: string): Promise<boolean> {
    // Get content
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
    });

    if (!content) return false;

    // Creator has access
    if (content.creatorId === userId) return true;

    // Free content
    if (content.isFree || content.unlockPrice === 0) return true;

    // Check if purchased
    const purchase = await db.query.contentPurchases.findFirst({
      where: and(
        eq(contentPurchases.contentId, contentId),
        eq(contentPurchases.userId, userId)
      ),
    });

    return !!purchase;
  }

  /**
   * Get content feed (all published content)
   */
  static async getContentFeed(options: {
    limit?: number;
    offset?: number;
    creatorId?: string;
    contentType?: ContentType;
  } = {}) {
    const { limit = 20, offset = 0, creatorId, contentType } = options;

    let query = db
      .select({
        id: contentItems.id,
        title: contentItems.title,
        description: contentItems.description,
        contentType: contentItems.contentType,
        unlockPrice: contentItems.unlockPrice,
        isFree: contentItems.isFree,
        thumbnailUrl: contentItems.thumbnailUrl,
        viewCount: contentItems.viewCount,
        purchaseCount: contentItems.purchaseCount,
        durationSeconds: contentItems.durationSeconds,
        createdAt: contentItems.createdAt,
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isCreatorVerified: users.isCreatorVerified,
        },
      })
      .from(contentItems)
      .innerJoin(users, eq(contentItems.creatorId, users.id))
      .where(eq(contentItems.isPublished, true))
      .orderBy(desc(contentItems.createdAt))
      .limit(limit)
      .offset(offset);

    // Apply filters if provided
    if (creatorId) {
      query = query.where(eq(contentItems.creatorId, creatorId)) as any;
    }

    if (contentType) {
      query = query.where(eq(contentItems.contentType, contentType)) as any;
    }

    return await query;
  }

  /**
   * Get creator's content
   */
  static async getCreatorContent(creatorId: string) {
    return await db.query.contentItems.findMany({
      where: eq(contentItems.creatorId, creatorId),
      orderBy: [desc(contentItems.createdAt)],
    });
  }

  /**
   * Get user's purchased content (library)
   */
  static async getUserLibrary(userId: string) {
    const purchases = await db
      .select({
        purchase: contentPurchases,
        content: contentItems,
        creator: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(contentPurchases)
      .innerJoin(contentItems, eq(contentPurchases.contentId, contentItems.id))
      .innerJoin(users, eq(contentItems.creatorId, users.id))
      .where(eq(contentPurchases.userId, userId))
      .orderBy(desc(contentPurchases.unlockedAt));

    return purchases;
  }

  /**
   * Get single content item with access check
   */
  static async getContent(contentId: string, userId?: string) {
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isCreatorVerified: true,
          },
        },
      },
    });

    if (!content) return null;

    let hasAccess = false;
    if (userId) {
      hasAccess = await this.hasAccess(userId, contentId);
    }

    return {
      ...content,
      hasAccess,
    };
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(contentId: string) {
    await db
      .update(contentItems)
      .set({
        viewCount: sql`${contentItems.viewCount} + 1`,
      })
      .where(eq(contentItems.id, contentId));
  }

  /**
   * Update content
   */
  static async updateContent(
    contentId: string,
    creatorId: string,
    updates: Partial<{
      title: string;
      description: string;
      unlockPrice: number;
      isPublished: boolean;
    }>
  ) {
    // Verify creator owns this content
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
    });

    if (!content || content.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    const [updated] = await db
      .update(contentItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, contentId))
      .returning();

    return updated;
  }

  /**
   * Delete content
   */
  static async deleteContent(contentId: string, creatorId: string) {
    // Verify creator owns this content
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
    });

    if (!content || content.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    // Check if content has purchases
    const purchaseCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentPurchases)
      .where(eq(contentPurchases.contentId, contentId));

    if (purchaseCount[0]?.count > 0) {
      // Don't delete if purchased, just unpublish
      return await this.updateContent(contentId, creatorId, { isPublished: false });
    }

    // Delete if no purchases
    await db.delete(contentItems).where(eq(contentItems.id, contentId));
    return { deleted: true };
  }

  /**
   * Get content stats for creator
   */
  static async getContentStats(contentId: string, creatorId: string) {
    const content = await db.query.contentItems.findFirst({
      where: eq(contentItems.id, contentId),
    });

    if (!content || content.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    // Get top buyers
    const topBuyers = await db
      .select({
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        coinsSpent: contentPurchases.coinsSpent,
        unlockedAt: contentPurchases.unlockedAt,
      })
      .from(contentPurchases)
      .innerJoin(users, eq(contentPurchases.userId, users.id))
      .where(eq(contentPurchases.contentId, contentId))
      .orderBy(desc(contentPurchases.unlockedAt))
      .limit(10);

    return {
      content,
      topBuyers,
    };
  }
}
