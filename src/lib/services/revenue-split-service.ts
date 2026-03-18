import { db } from '@/lib/data/system';
import { platformFeeConfig, creatorRevenueSplits, revenueSplitLedger } from '@/db/schema';
import { eq, and, sql, isNull, lte, or } from 'drizzle-orm';

interface SplitResult {
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  agencyFeePercent: number;
  agencyFeeAmount: number;
  agencyId: string | null;
  creatorNetAmount: number;
}

/**
 * Revenue Split Service
 *
 * Calculates platform and agency fees for creator earnings.
 * Supports:
 * - Global default platform fee (from platform_fee_config)
 * - Per-category platform fee (streams, calls, cloud, subscriptions)
 * - Per-creator overrides (VIP deals, agency cuts)
 */
export class RevenueSplitService {

  /**
   * Calculate the split for a creator earning.
   * Returns how much goes to platform, agency, and creator.
   */
  static async calculateSplit(
    creatorId: string,
    grossAmount: number,
    category: string = 'default',
  ): Promise<SplitResult> {
    // 1. Get per-creator override (if active)
    const now = new Date();
    const creatorSplit = await db.query.creatorRevenueSplits.findFirst({
      where: and(
        eq(creatorRevenueSplits.creatorId, creatorId),
        eq(creatorRevenueSplits.isActive, true),
        lte(creatorRevenueSplits.effectiveFrom, now),
        or(
          isNull(creatorRevenueSplits.effectiveUntil),
          sql`${creatorRevenueSplits.effectiveUntil} > ${now}`,
        ),
      ),
    });

    // 2. Get platform fee rate
    let platformFeePercent: number;

    if (creatorSplit?.platformFeePercent != null) {
      // Creator has custom platform fee
      platformFeePercent = Number(creatorSplit.platformFeePercent);
    } else {
      // Use category-specific or default global fee
      const feeConfig = await db.query.platformFeeConfig.findFirst({
        where: and(
          eq(platformFeeConfig.key, category),
          eq(platformFeeConfig.isActive, true),
        ),
      });

      if (feeConfig) {
        platformFeePercent = Number(feeConfig.feePercent);
      } else {
        // Fallback to default
        const defaultConfig = await db.query.platformFeeConfig.findFirst({
          where: eq(platformFeeConfig.key, 'default'),
        });
        platformFeePercent = defaultConfig ? Number(defaultConfig.feePercent) : 20;
      }
    }

    // 3. Calculate platform fee
    const platformFeeAmount = Math.floor(grossAmount * platformFeePercent / 100);

    // 4. Calculate agency fee (from creator's remaining share)
    let agencyFeePercent = 0;
    let agencyFeeAmount = 0;
    let agencyId: string | null = null;

    if (creatorSplit?.agencyId && creatorSplit.agencyFeePercent) {
      agencyId = creatorSplit.agencyId;
      agencyFeePercent = Number(creatorSplit.agencyFeePercent);
      const afterPlatform = grossAmount - platformFeeAmount;
      agencyFeeAmount = Math.floor(afterPlatform * agencyFeePercent / 100);
    }

    // 5. Creator net = gross - platform fee - agency fee
    const creatorNetAmount = grossAmount - platformFeeAmount - agencyFeeAmount;

    return {
      grossAmount,
      platformFeePercent,
      platformFeeAmount,
      agencyFeePercent,
      agencyFeeAmount,
      agencyId,
      creatorNetAmount,
    };
  }

  /**
   * Record a split in the ledger (for audit trail)
   */
  static async recordSplit(transactionId: string, creatorId: string, split: SplitResult) {
    await db.insert(revenueSplitLedger).values({
      transactionId,
      creatorId,
      grossAmount: split.grossAmount,
      platformFeePercent: String(split.platformFeePercent),
      platformFeeAmount: split.platformFeeAmount,
      agencyFeePercent: split.agencyFeePercent ? String(split.agencyFeePercent) : null,
      agencyFeeAmount: split.agencyFeeAmount || null,
      agencyId: split.agencyId,
      creatorNetAmount: split.creatorNetAmount,
    });
  }

  /**
   * Get all platform fee configs
   */
  static async getPlatformFees() {
    return db.query.platformFeeConfig.findMany();
  }

  /**
   * Update a platform fee config
   */
  static async updatePlatformFee(key: string, feePercent: number, updatedBy: string) {
    await db.update(platformFeeConfig)
      .set({
        feePercent: String(feePercent),
        updatedAt: new Date(),
        updatedBy: updatedBy,
      })
      .where(eq(platformFeeConfig.key, key));
  }

  /**
   * Get creator's revenue split config
   */
  static async getCreatorSplit(creatorId: string) {
    return db.query.creatorRevenueSplits.findFirst({
      where: and(
        eq(creatorRevenueSplits.creatorId, creatorId),
        eq(creatorRevenueSplits.isActive, true),
      ),
    });
  }

  /**
   * Set creator's custom revenue split (admin only)
   */
  static async setCreatorSplit(params: {
    creatorId: string;
    platformFeePercent?: number;
    agencyId?: string;
    agencyFeePercent?: number;
    agencyName?: string;
    effectiveUntil?: Date;
    notes?: string;
    createdBy: string;
  }) {
    // Deactivate any existing splits
    await db.update(creatorRevenueSplits)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(creatorRevenueSplits.creatorId, params.creatorId));

    // Create new split
    const [split] = await db.insert(creatorRevenueSplits).values({
      creatorId: params.creatorId,
      platformFeePercent: params.platformFeePercent != null ? String(params.platformFeePercent) : null,
      agencyId: params.agencyId || null,
      agencyFeePercent: params.agencyFeePercent != null ? String(params.agencyFeePercent) : null,
      agencyName: params.agencyName || null,
      effectiveUntil: params.effectiveUntil || null,
      notes: params.notes || null,
      createdBy: params.createdBy,
    }).returning();

    return split;
  }
}
