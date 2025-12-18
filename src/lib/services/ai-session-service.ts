import { db } from '@/lib/data/system';
import { aiSessions, aiTwinSettings, spendHolds, walletTransactions, wallets } from '@/db/schema';
import { eq, sql, and, desc, or } from 'drizzle-orm';
import { WalletService } from '@/lib/wallet/wallet-service';
import { invalidateBalanceCache } from '@/lib/cache';

// Platform fee for AI sessions (20%)
const PLATFORM_FEE_PERCENT = 20;

// xAI API cost per minute (in coins equivalent - $0.05/min at $0.01 per coin)
const XAI_API_COST_PER_MINUTE = 5;

export class AiSessionService {
  /**
   * Start a new AI session
   * Creates a session record and places a hold for minimum duration
   */
  static async startSession(
    fanId: string,
    creatorId: string,
    voice: 'ara' | 'eve' | 'leo' | 'rex' | 'sal'
  ) {
    // Get creator's AI Twin settings
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, creatorId),
    });

    if (!settings || !settings.enabled) {
      throw new Error('AI Twin not available for this creator');
    }

    // Calculate hold amount for minimum session duration
    const holdAmount = settings.pricePerMinute * settings.minimumMinutes;

    // Create hold using WalletService (has proper FOR UPDATE locking)
    let hold;
    try {
      hold = await WalletService.createHold({
        userId: fanId,
        amount: holdAmount,
        purpose: 'ai_session',
        relatedId: undefined, // Will be set after session is created
      });
    } catch (error: any) {
      if (error.message === 'Insufficient balance for hold') {
        const availableBalance = await WalletService.getAvailableBalance(fanId);
        throw new Error(
          `Insufficient balance. You have ${availableBalance} coins available but need ${holdAmount} coins for a ${settings.minimumMinutes} minute session at ${settings.pricePerMinute} coins/min.`
        );
      }
      throw error;
    }

    // Create session record
    const [session] = await db
      .insert(aiSessions)
      .values({
        creatorId,
        fanId,
        voice,
        status: 'active',
        pricePerMinute: settings.pricePerMinute,
        startedAt: new Date(),
      })
      .returning();

    // Link the hold to the session
    await db
      .update(spendHolds)
      .set({ relatedId: session.id })
      .where(eq(spendHolds.id, hold.id));

    return {
      session,
      settings: {
        pricePerMinute: settings.pricePerMinute,
        minimumMinutes: settings.minimumMinutes,
        maxSessionMinutes: settings.maxSessionMinutes,
        welcomeMessage: settings.welcomeMessage,
      },
      holdId: hold.id,
    };
  }

  /**
   * End an AI session and process billing
   *
   * SECURITY: Uses a single transaction with FOR UPDATE locks to prevent:
   * - Double-charging through concurrent endSession requests
   * - Balance inconsistencies from stale data
   */
  static async endSession(
    sessionId: string,
    userId: string,
    rating?: number,
    ratingComment?: string
  ) {
    const session = await db.query.aiSessions.findFirst({
      where: eq(aiSessions.id, sessionId),
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.fanId !== userId) {
      throw new Error('Unauthorized');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Calculate duration
    const endTime = new Date();
    const startTime = session.startedAt;
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Calculate charges
    const calculatedCoins = session.pricePerMinute * durationMinutes;
    const platformFee = Math.floor(calculatedCoins * PLATFORM_FEE_PERCENT / 100);
    const creatorEarnings = calculatedCoins - platformFee;
    const apiCost = XAI_API_COST_PER_MINUTE * durationMinutes;

    // Process billing in a transaction
    const { updatedSession, fanId, creatorId } = await db.transaction(async (tx) => {
      const idempotencyKeyDebit = `ai-session-end-${sessionId}-debit`;
      const idempotencyKeyCredit = `ai-session-end-${sessionId}-credit`;

      // Check for idempotency
      const existingTx = await tx.query.walletTransactions.findFirst({
        where: eq(walletTransactions.idempotencyKey, idempotencyKeyDebit),
      });

      if (existingTx) {
        console.log('[AiSessionService] Session end already processed:', sessionId);
        const [result] = await tx
          .update(aiSessions)
          .set({
            status: 'completed',
            endedAt: endTime,
            durationSeconds,
            coinsSpent: calculatedCoins,
            creatorEarnings,
            platformFee,
            apiCost,
            rating,
            ratingComment,
            updatedAt: endTime,
          })
          .where(eq(aiSessions.id, sessionId))
          .returning();
        return { updatedSession: result, fanId: session.fanId, creatorId: session.creatorId };
      }

      let billedCoins = calculatedCoins;

      // Get hold for this session
      const hold = await tx.query.spendHolds.findFirst({
        where: and(
          eq(spendHolds.relatedId, sessionId),
          eq(spendHolds.status, 'active')
        ),
      });

      if (hold) {
        // Lock both wallets
        const lockedWalletResult = await tx.execute(
          sql`SELECT user_id, balance, held_balance FROM wallets WHERE user_id IN (${session.fanId}, ${session.creatorId}) FOR UPDATE`
        );

        const walletRows = lockedWalletResult as unknown as Array<{
          user_id: string;
          balance: number;
          held_balance: number;
        }>;
        const fanWallet = walletRows.find(w => w.user_id === session.fanId);

        if (fanWallet) {
          // Cap charge to available balance
          const maxChargeable = fanWallet.balance;
          if (calculatedCoins > maxChargeable) {
            console.warn(
              `[AiSessionService] Session ${sessionId} billing capped: calculated ${calculatedCoins}, ` +
              `but fan only has ${maxChargeable}.`
            );
            billedCoins = Math.max(0, maxChargeable);
          }
        }

        // Recalculate earnings with potentially capped amount
        const actualPlatformFee = Math.floor(billedCoins * PLATFORM_FEE_PERCENT / 100);
        const actualCreatorEarnings = billedCoins - actualPlatformFee;

        // Settle the hold
        await tx
          .update(spendHolds)
          .set({
            status: 'settled',
            settledAt: new Date(),
          })
          .where(eq(spendHolds.id, hold.id));

        // Debit fan
        await tx.insert(walletTransactions).values({
          userId: session.fanId,
          amount: -billedCoins,
          type: 'ai_session_charge',
          status: 'completed',
          description: `AI Twin chat (${durationMinutes} min)`,
          idempotencyKey: idempotencyKeyDebit,
          metadata: JSON.stringify({
            sessionId,
            durationMinutes,
            creatorId: session.creatorId,
            pricePerMinute: session.pricePerMinute,
            calculatedCoins,
            billedCoins,
            wasCapped: billedCoins < calculatedCoins,
          }),
        });

        // Credit creator
        await tx.insert(walletTransactions).values({
          userId: session.creatorId,
          amount: actualCreatorEarnings,
          type: 'ai_session_earnings',
          status: 'completed',
          description: `AI Twin earnings (${durationMinutes} min)`,
          idempotencyKey: idempotencyKeyCredit,
          metadata: JSON.stringify({
            sessionId,
            durationMinutes,
            fanId: session.fanId,
            grossAmount: billedCoins,
            platformFee: actualPlatformFee,
            netEarnings: actualCreatorEarnings,
          }),
        });

        // Update fan wallet
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${billedCoins}`,
            heldBalance: sql`GREATEST(0, ${wallets.heldBalance} - ${hold.amount})`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, session.fanId));

        // Update creator wallet
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${actualCreatorEarnings}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, session.creatorId));

        // Update creator's AI Twin stats
        await tx
          .update(aiTwinSettings)
          .set({
            totalSessions: sql`${aiTwinSettings.totalSessions} + 1`,
            totalMinutes: sql`${aiTwinSettings.totalMinutes} + ${durationMinutes}`,
            totalEarnings: sql`${aiTwinSettings.totalEarnings} + ${actualCreatorEarnings}`,
            updatedAt: new Date(),
          })
          .where(eq(aiTwinSettings.creatorId, session.creatorId));
      }

      // Update session record
      const [result] = await tx
        .update(aiSessions)
        .set({
          status: 'completed',
          endedAt: endTime,
          durationSeconds,
          coinsSpent: billedCoins,
          creatorEarnings: billedCoins - Math.floor(billedCoins * PLATFORM_FEE_PERCENT / 100),
          platformFee: Math.floor(billedCoins * PLATFORM_FEE_PERCENT / 100),
          apiCost,
          rating,
          ratingComment,
          updatedAt: endTime,
        })
        .where(eq(aiSessions.id, sessionId))
        .returning();

      return { updatedSession: result, fanId: session.fanId, creatorId: session.creatorId };
    });

    // Invalidate caches outside transaction
    invalidateBalanceCache(fanId).catch(err =>
      console.error('[AiSessionService] Failed to invalidate fan cache:', err)
    );
    invalidateBalanceCache(creatorId).catch(err =>
      console.error('[AiSessionService] Failed to invalidate creator cache:', err)
    );

    return updatedSession;
  }

  /**
   * Process a billing tick for an active session
   * Called every minute to charge incrementally
   *
   * Returns:
   * - success: whether billing succeeded
   * - shouldContinue: whether session can continue (has balance)
   * - remainingBalance: fan's remaining balance
   * - minutesRemaining: estimated minutes left based on balance
   * - totalCharged: total coins charged this session
   */
  static async tickSession(sessionId: string, userId: string): Promise<{
    success: boolean;
    shouldContinue: boolean;
    remainingBalance: number;
    minutesRemaining: number;
    totalCharged: number;
    message?: string;
  }> {
    const session = await db.query.aiSessions.findFirst({
      where: eq(aiSessions.id, sessionId),
    });

    if (!session) {
      return { success: false, shouldContinue: false, remainingBalance: 0, minutesRemaining: 0, totalCharged: 0, message: 'Session not found' };
    }

    if (session.fanId !== userId) {
      return { success: false, shouldContinue: false, remainingBalance: 0, minutesRemaining: 0, totalCharged: 0, message: 'Unauthorized' };
    }

    if (session.status !== 'active') {
      return { success: false, shouldContinue: false, remainingBalance: 0, minutesRemaining: 0, totalCharged: session.coinsSpent || 0, message: 'Session not active' };
    }

    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
    const totalMinutes = Math.ceil(elapsedSeconds / 60);
    const minutesBilled = session.minutesBilled || 0;
    const minutesToBill = totalMinutes - minutesBilled;

    // Nothing to bill yet
    if (minutesToBill <= 0) {
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });
      const balance = wallet?.balance || 0;
      const minutesRemaining = Math.floor(balance / session.pricePerMinute);

      return {
        success: true,
        shouldContinue: balance >= session.pricePerMinute,
        remainingBalance: balance,
        minutesRemaining,
        totalCharged: session.coinsSpent || 0,
      };
    }

    const amountToCharge = minutesToBill * session.pricePerMinute;
    const platformFee = Math.floor(amountToCharge * PLATFORM_FEE_PERCENT / 100);
    const creatorEarnings = amountToCharge - platformFee;

    // Process billing in a transaction
    const result = await db.transaction(async (tx) => {
      // Lock fan's wallet
      const [fanWallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, session.fanId))
        .for('update');

      if (!fanWallet || fanWallet.balance < amountToCharge) {
        // Not enough balance - charge what we can and end session
        const availableBalance = fanWallet?.balance || 0;
        const affordableMinutes = Math.floor(availableBalance / session.pricePerMinute);

        if (affordableMinutes <= 0) {
          return {
            success: false,
            shouldContinue: false,
            remainingBalance: availableBalance,
            minutesRemaining: 0,
            totalCharged: session.coinsSpent || 0,
            message: 'Insufficient balance',
          };
        }

        // Charge what they can afford
        const partialCharge = affordableMinutes * session.pricePerMinute;
        const partialPlatformFee = Math.floor(partialCharge * PLATFORM_FEE_PERCENT / 100);
        const partialCreatorEarnings = partialCharge - partialPlatformFee;

        // Create transactions
        const idempotencyKey = `ai-tick-${sessionId}-${minutesBilled + affordableMinutes}`;

        await tx.insert(walletTransactions).values({
          userId: session.fanId,
          amount: -partialCharge,
          type: 'ai_session_charge',
          status: 'completed',
          description: `AI Twin chat (${affordableMinutes} min)`,
          idempotencyKey,
        });

        await tx.insert(walletTransactions).values({
          userId: session.creatorId,
          amount: partialCreatorEarnings,
          type: 'ai_session_earnings',
          status: 'completed',
          description: `AI Twin earnings (${affordableMinutes} min)`,
          idempotencyKey: `${idempotencyKey}-creator`,
        });

        // Update wallets
        await tx.update(wallets)
          .set({ balance: sql`${wallets.balance} - ${partialCharge}`, updatedAt: new Date() })
          .where(eq(wallets.userId, session.fanId));

        await tx.update(wallets)
          .set({ balance: sql`${wallets.balance} + ${partialCreatorEarnings}`, updatedAt: new Date() })
          .where(eq(wallets.userId, session.creatorId));

        // Update session
        const newTotalCharged = (session.coinsSpent || 0) + partialCharge;
        await tx.update(aiSessions)
          .set({
            minutesBilled: minutesBilled + affordableMinutes,
            coinsSpent: newTotalCharged,
            lastBilledAt: now,
            updatedAt: now,
          })
          .where(eq(aiSessions.id, sessionId));

        return {
          success: true,
          shouldContinue: false, // Out of balance
          remainingBalance: availableBalance - partialCharge,
          minutesRemaining: 0,
          totalCharged: newTotalCharged,
          message: 'Balance depleted',
        };
      }

      // Full charge
      const idempotencyKey = `ai-tick-${sessionId}-${minutesBilled + minutesToBill}`;

      // Check idempotency
      const existingTx = await tx.query.walletTransactions.findFirst({
        where: eq(walletTransactions.idempotencyKey, idempotencyKey),
      });

      if (existingTx) {
        // Already processed
        const newBalance = fanWallet.balance;
        return {
          success: true,
          shouldContinue: newBalance >= session.pricePerMinute,
          remainingBalance: newBalance,
          minutesRemaining: Math.floor(newBalance / session.pricePerMinute),
          totalCharged: session.coinsSpent || 0,
        };
      }

      // Create transactions
      await tx.insert(walletTransactions).values({
        userId: session.fanId,
        amount: -amountToCharge,
        type: 'ai_session_charge',
        status: 'completed',
        description: `AI Twin chat (${minutesToBill} min)`,
        idempotencyKey,
      });

      await tx.insert(walletTransactions).values({
        userId: session.creatorId,
        amount: creatorEarnings,
        type: 'ai_session_earnings',
        status: 'completed',
        description: `AI Twin earnings (${minutesToBill} min)`,
        idempotencyKey: `${idempotencyKey}-creator`,
      });

      // Update wallets
      await tx.update(wallets)
        .set({ balance: sql`${wallets.balance} - ${amountToCharge}`, updatedAt: new Date() })
        .where(eq(wallets.userId, session.fanId));

      await tx.update(wallets)
        .set({ balance: sql`${wallets.balance} + ${creatorEarnings}`, updatedAt: new Date() })
        .where(eq(wallets.userId, session.creatorId));

      // Update session
      const newTotalCharged = (session.coinsSpent || 0) + amountToCharge;
      await tx.update(aiSessions)
        .set({
          minutesBilled: minutesBilled + minutesToBill,
          coinsSpent: newTotalCharged,
          lastBilledAt: now,
          updatedAt: now,
        })
        .where(eq(aiSessions.id, sessionId));

      const newBalance = fanWallet.balance - amountToCharge;
      const minutesRemaining = Math.floor(newBalance / session.pricePerMinute);

      return {
        success: true,
        shouldContinue: newBalance >= session.pricePerMinute,
        remainingBalance: newBalance,
        minutesRemaining,
        totalCharged: newTotalCharged,
      };
    });

    // Invalidate caches
    invalidateBalanceCache(session.fanId).catch(console.error);
    invalidateBalanceCache(session.creatorId).catch(console.error);

    return result;
  }

  /**
   * Mark a session as failed
   */
  static async failSession(sessionId: string, errorMessage: string) {
    const session = await db.query.aiSessions.findFirst({
      where: eq(aiSessions.id, sessionId),
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Release the hold if session failed before completion
    const hold = await db.query.spendHolds.findFirst({
      where: and(
        eq(spendHolds.relatedId, sessionId),
        eq(spendHolds.status, 'active')
      ),
    });

    if (hold) {
      try {
        await WalletService.releaseHold(hold.id);
      } catch (error) {
        console.error('[AiSessionService] Failed to release hold:', error);
      }
    }

    const [updated] = await db
      .update(aiSessions)
      .set({
        status: 'failed',
        endedAt: new Date(),
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(aiSessions.id, sessionId))
      .returning();

    return updated;
  }

  /**
   * Cancel a session (user-initiated before completion)
   */
  static async cancelSession(sessionId: string, userId: string) {
    const session = await db.query.aiSessions.findFirst({
      where: eq(aiSessions.id, sessionId),
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.fanId !== userId) {
      throw new Error('Unauthorized');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Calculate if minimum duration was met
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Get settings to check minimum
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, session.creatorId),
    });

    // If minimum duration not met, still charge minimum
    const minimumMinutes = settings?.minimumMinutes || 5;
    const effectiveMinutes = Math.max(durationMinutes, minimumMinutes);

    // End the session normally (charges for actual or minimum duration)
    return this.endSession(sessionId, userId);
  }

  /**
   * Get session history for a user (as fan or creator)
   */
  static async getSessionHistory(userId: string, limit = 50) {
    return db.query.aiSessions.findMany({
      where: or(
        eq(aiSessions.fanId, userId),
        eq(aiSessions.creatorId, userId)
      ),
      with: {
        fan: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [desc(aiSessions.createdAt)],
      limit,
    });
  }

  /**
   * Get active session for a user
   */
  static async getActiveSession(fanId: string) {
    return db.query.aiSessions.findFirst({
      where: and(
        eq(aiSessions.fanId, fanId),
        eq(aiSessions.status, 'active')
      ),
    });
  }
}
