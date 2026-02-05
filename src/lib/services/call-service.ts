import { db } from '@/lib/data/system';
import { calls, creatorSettings, users, spendHolds, walletTransactions, wallets } from '@/lib/data/system';
import { eq, and, or, desc, lt, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { WalletService } from '@/lib/wallet/wallet-service';
import { invalidateBalanceCache } from '@/lib/cache';
import { FinancialAuditService } from '@/lib/services/financial-audit-service';

// Call timeout settings
const PENDING_CALL_TIMEOUT_MINUTES = 5; // Calls auto-expire after 5 minutes
const ACCEPTED_CALL_TIMEOUT_MINUTES = 30; // Accepted calls that never started
const ACTIVE_CALL_MAX_DURATION_MINUTES = 240; // 4 hours max call duration

export class CallService {
  /**
   * Get or create creator settings
   */
  static async getCreatorSettings(userId: string) {
    let settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, userId),
    });

    // Create default settings if they don't exist
    // Default rates: 1 coin = $0.10 for creator when withdrawn
    if (!settings) {
      const [newSettings] = await db
        .insert(creatorSettings)
        .values({
          userId,
          callRatePerMinute: 25, // 25 coins/min = $2.50/min for creator
          minimumCallDuration: 5, // 5 min minimum
          voiceCallRatePerMinute: 15, // 15 coins/min = $1.50/min for creator
          minimumVoiceCallDuration: 5, // 5 min minimum
          messageRate: 3, // 3 coins = $0.30 per message (minimum)
          isAvailableForCalls: true,
          isAvailableForVoiceCalls: true,
        })
        .returning();

      settings = newSettings;
    }

    return settings;
  }

  /**
   * Update creator call settings
   */
  static async updateCreatorSettings(
    userId: string,
    updates: Partial<typeof creatorSettings.$inferInsert>
  ) {
    const existing = await this.getCreatorSettings(userId);

    const [updated] = await db
      .update(creatorSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(creatorSettings.id, existing.id))
      .returning();

    return updated;
  }

  /**
   * Request a call with a creator
   */
  static async requestCall(fanId: string, creatorId: string, callType: 'video' | 'voice' = 'video') {
    // Get creator settings
    const settings = await this.getCreatorSettings(creatorId);

    // Check availability based on call type
    if (callType === 'video' && !settings.isAvailableForCalls) {
      throw new Error('Creator is not available for video calls');
    }

    if (callType === 'voice' && !settings.isAvailableForVoiceCalls) {
      throw new Error('Creator is not available for voice calls');
    }

    // Calculate estimated coins for minimum duration based on call type
    const ratePerMinute = callType === 'video' ? settings.callRatePerMinute : settings.voiceCallRatePerMinute;
    const minimumDuration = callType === 'video' ? settings.minimumCallDuration : settings.minimumVoiceCallDuration;
    const estimatedCoins = ratePerMinute * minimumDuration;

    // Use WalletService.createHold which has proper FOR UPDATE locking
    // This prevents race conditions where concurrent calls could exceed available balance
    let hold;
    try {
      hold = await WalletService.createHold({
        userId: fanId,
        amount: estimatedCoins,
        purpose: callType === 'video' ? 'video_call' : 'voice_call',
        relatedId: undefined, // Will be set after call is created
      });
    } catch (error: any) {
      if (error.message === 'Insufficient balance for hold') {
        // Get current available balance for user-friendly message
        const availableBalance = await WalletService.getAvailableBalance(fanId);
        throw new Error(`Insufficient balance. You have ${availableBalance} coins available but need ${estimatedCoins} coins for a ${minimumDuration} minute call at ${ratePerMinute} coins/min.`);
      }
      if (error.message === 'Wallet not found') {
        throw new Error('Wallet not found');
      }
      throw error;
    }

    // Create call request
    const roomName = `call-${nanoid(16)}`;

    const [call] = await db
      .insert(calls)
      .values({
        fanId,
        creatorId,
        callType,
        status: 'pending',
        ratePerMinute,
        estimatedCoins,
        roomName,
        holdId: hold.id,
        acceptedAt: null,
      })
      .returning();

    // Link the hold to the call for auditing/reconciliation
    await db
      .update(spendHolds)
      .set({ relatedId: call.id })
      .where(eq(spendHolds.id, hold.id));

    return call;
  }

  /**
   * Accept a call request
   */
  static async acceptCall(callId: string, creatorId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    if (call.status !== 'pending') {
      throw new Error('Call is not pending');
    }

    const [updated] = await db
      .update(calls)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updated;
  }

  /**
   * Reject a call request
   */
  static async rejectCall(callId: string, creatorId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.creatorId !== creatorId) {
      throw new Error('Unauthorized');
    }

    if (call.status !== 'pending') {
      throw new Error('Call is not pending');
    }

    // Release the hold using WalletService for proper transaction handling
    if (call.holdId) {
      try {
        await WalletService.releaseHold(call.holdId);
      } catch (error) {
        console.error('[CallService] Failed to release hold on reject:', error);
        // Continue with rejecting the call even if hold release fails
        // The hold will be cleaned up by reconciliation
      }
    }

    const [updated] = await db
      .update(calls)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updated;
  }

  /**
   * Cancel a call request (fan or creator before call starts)
   */
  static async cancelCall(callId: string, userId: string, reason?: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Either party can cancel before the call starts
    if (call.fanId !== userId && call.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    // Can only cancel pending or accepted calls (not active or completed)
    if (call.status !== 'pending' && call.status !== 'accepted') {
      throw new Error('Cannot cancel a call that has already started or completed');
    }

    // Release the hold using WalletService for proper transaction handling
    if (call.holdId) {
      try {
        await WalletService.releaseHold(call.holdId);
      } catch (error) {
        console.error('[CallService] Failed to release hold on cancel:', error);
        // Continue with cancelling the call
      }
    }

    const [updated] = await db
      .update(calls)
      .set({
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by user',
        cancelledBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updated;
  }

  /**
   * Start a call
   */
  static async startCall(callId: string, userId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.fanId !== userId && call.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    if (call.status !== 'accepted') {
      throw new Error('Call must be accepted first');
    }

    const [updated] = await db
      .update(calls)
      .set({
        status: 'active',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updated;
  }

  /**
   * End a call and process billing
   *
   * SECURITY: Uses a single transaction with FOR UPDATE locks to prevent:
   * - Double-charging through concurrent endCall requests
   * - Balance inconsistencies from stale data
   *
   * BILLING POLICY: If the call runs longer than estimated, we cap the charge
   * at what's available (hold amount + any free balance). This prevents the
   * CHECK constraints from failing and ensures calls always complete gracefully.
   */
  static async endCall(callId: string, userId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.fanId !== userId && call.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    if (call.status !== 'active' && call.status !== 'accepted') {
      throw new Error('Call is not active');
    }

    // Calculate duration - use startedAt or acceptedAt as fallback
    const endTime = new Date();
    const startTime = call.startedAt || call.acceptedAt || new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Calculate what we'd ideally charge based on duration
    const calculatedCoins = call.ratePerMinute * durationMinutes;

    // Use a single transaction with FOR UPDATE locks to prevent race conditions
    const { updatedCall, fanId, creatorId, billedCoins, wasCapped } = await db.transaction(async (tx) => {
      // Generate idempotency key for this call completion
      const idempotencyKeyDebit = `call-end-${callId}-debit`;
      const idempotencyKeyCredit = `call-end-${callId}-credit`;

      // Check for idempotency (already processed)
      const existingTx = await tx.query.walletTransactions.findFirst({
        where: eq(walletTransactions.idempotencyKey, idempotencyKeyDebit),
      });

      if (existingTx) {
        console.log('[CallService] Call end already processed (idempotent):', callId);
        // Just update call status and return
        const [result] = await tx
          .update(calls)
          .set({
            status: 'completed',
            endedAt: endTime,
            durationSeconds,
            actualCoins: calculatedCoins,
            updatedAt: endTime,
          })
          .where(eq(calls.id, callId))
          .returning();
        // Return billedCoins: 0 to skip audit logging (already logged)
        return { updatedCall: result, fanId: call.fanId, creatorId: call.creatorId, billedCoins: 0, wasCapped: false };
      }

      let billedCoins = calculatedCoins;

      // Process the hold if exists
      if (call.holdId) {
        // Lock both wallets to prevent race conditions
        const lockedWalletResult = await tx.execute(
          sql`SELECT user_id, balance, held_balance FROM wallets WHERE user_id IN (${call.fanId}, ${call.creatorId}) FOR UPDATE`
        );

        // Find fan wallet from locked results
        const walletRows = lockedWalletResult as unknown as Array<{
          user_id: string;
          balance: number;
          held_balance: number;
        }>;
        const fanWallet = walletRows.find(w => w.user_id === call.fanId);

        if (fanWallet) {
          // CRITICAL: Cap the charge to prevent negative balance
          // Max we can charge = current balance (which includes the held amount)
          const maxChargeable = fanWallet.balance;

          if (calculatedCoins > maxChargeable) {
            console.warn(
              `[CallService] Call ${callId} billing capped: calculated ${calculatedCoins}, ` +
              `but fan only has ${maxChargeable}. Estimated was ${call.estimatedCoins}.`
            );
            billedCoins = Math.max(0, maxChargeable);
          }
        }

        // Settle the hold
        await tx
          .update(spendHolds)
          .set({
            status: 'settled',
            settledAt: new Date(),
          })
          .where(eq(spendHolds.id, call.holdId));

        // Debit fan with idempotency key
        await tx.insert(walletTransactions).values({
          userId: call.fanId,
          amount: -billedCoins,
          type: 'call_charge',
          status: 'completed',
          description: `${call.callType === 'voice' ? 'Voice' : 'Video'} call (${durationMinutes} min)`,
          idempotencyKey: idempotencyKeyDebit,
          metadata: JSON.stringify({
            callId,
            durationMinutes,
            callType: call.callType,
            calculatedCoins,
            billedCoins,
            wasCapped: billedCoins < calculatedCoins,
          }),
        });

        // Credit creator with idempotency key
        await tx.insert(walletTransactions).values({
          userId: call.creatorId,
          amount: billedCoins,
          type: 'call_earnings',
          status: 'completed',
          description: `Call earnings (${durationMinutes} min)`,
          idempotencyKey: idempotencyKeyCredit,
          metadata: JSON.stringify({
            callId,
            durationMinutes,
            callType: call.callType,
            calculatedCoins,
            billedCoins,
            wasCapped: billedCoins < calculatedCoins,
          }),
        });

        // Update fan wallet: deduct billed coins and release hold
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} - ${billedCoins}`,
            heldBalance: sql`GREATEST(0, ${wallets.heldBalance} - ${call.estimatedCoins || 0})`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, call.fanId));

        // Update creator wallet: add earnings
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${billedCoins}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, call.creatorId));
      }

      // Update call status with actual billed amount
      const [result] = await tx
        .update(calls)
        .set({
          status: 'completed',
          endedAt: endTime,
          durationSeconds,
          actualCoins: billedCoins,
          updatedAt: endTime,
        })
        .where(eq(calls.id, callId))
        .returning();

      return {
        updatedCall: result,
        fanId: call.fanId,
        creatorId: call.creatorId,
        billedCoins,
        wasCapped: billedCoins < calculatedCoins,
      };
    });

    // Invalidate caches OUTSIDE the transaction to prevent Redis errors from rolling back DB
    invalidateBalanceCache(fanId).catch(err =>
      console.error('[CallService] Failed to invalidate fan cache:', err)
    );
    invalidateBalanceCache(creatorId).catch(err =>
      console.error('[CallService] Failed to invalidate creator cache:', err)
    );

    // Log to financial audit (non-blocking, after successful transaction)
    if (billedCoins > 0) {
      // Log fan's payment
      FinancialAuditService.log({
        eventType: 'call_payment',
        actorId: fanId,
        targetId: creatorId,
        amount: billedCoins,
        idempotencyKey: `call-end-${callId}-debit`,
        description: `${updatedCall.callType === 'voice' ? 'Voice' : 'Video'} call payment (${durationMinutes} min)`,
        metadata: {
          callId,
          durationMinutes,
          durationSeconds,
          callType: updatedCall.callType,
          ratePerMinute: updatedCall.ratePerMinute,
          calculatedCoins,
          billedCoins,
          wasCapped,
        },
      }).catch(err => console.error('[CallService] Audit log (fan) failed:', err));

      // Log creator's earnings
      FinancialAuditService.log({
        eventType: 'call_earned',
        actorId: creatorId,
        targetId: fanId,
        amount: billedCoins,
        idempotencyKey: `call-end-${callId}-credit`,
        description: `${updatedCall.callType === 'voice' ? 'Voice' : 'Video'} call earnings (${durationMinutes} min)`,
        metadata: {
          callId,
          durationMinutes,
          durationSeconds,
          callType: updatedCall.callType,
          ratePerMinute: updatedCall.ratePerMinute,
          calculatedCoins,
          billedCoins,
          wasCapped,
        },
      }).catch(err => console.error('[CallService] Audit log (creator) failed:', err));
    }

    return updatedCall;
  }

  /**
   * Get pending call requests for a creator
   */
  static async getPendingRequests(creatorId: string) {
    return db.query.calls.findMany({
      where: and(
        eq(calls.creatorId, creatorId),
        eq(calls.status, 'pending')
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
      },
      orderBy: [desc(calls.requestedAt)],
    });
  }

  /**
   * Get call history for a user
   */
  static async getCallHistory(userId: string, limit = 50) {
    return db.query.calls.findMany({
      where: or(
        eq(calls.fanId, userId),
        eq(calls.creatorId, userId)
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
      orderBy: [desc(calls.createdAt)],
      limit,
    });
  }

  /**
   * Mark a call as missed (timed out)
   */
  static async markCallAsMissed(callId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.status !== 'pending') {
      throw new Error('Call is not pending');
    }

    // Release the hold using WalletService for proper transaction handling
    if (call.holdId) {
      try {
        await WalletService.releaseHold(call.holdId);
      } catch (error) {
        console.error('[CallService] Failed to release hold on missed call:', error);
        // Continue with marking call as missed even if hold release fails
        // The hold will be cleaned up by reconciliation
      }
    }

    // Update call status to missed
    const [updated] = await db
      .update(calls)
      .set({
        status: 'missed',
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updated;
  }

  /**
   * Cleanup expired pending calls
   * Should be called periodically (e.g., every minute via cron or on request)
   */
  static async cleanupExpiredCalls(): Promise<number> {
    const timeoutThreshold = new Date(Date.now() - PENDING_CALL_TIMEOUT_MINUTES * 60 * 1000);

    // Find all pending calls older than the timeout threshold
    const expiredCalls = await db.query.calls.findMany({
      where: and(
        eq(calls.status, 'pending'),
        lt(calls.requestedAt, timeoutThreshold)
      ),
    });

    let cleanedCount = 0;

    for (const call of expiredCalls) {
      try {
        await this.markCallAsMissed(call.id);
        cleanedCount++;
        console.log(`[CallService] Auto-expired call ${call.id} (requested: ${call.requestedAt})`);
      } catch (error) {
        console.error(`[CallService] Failed to expire call ${call.id}:`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * Check if a specific call has timed out
   */
  static async isCallExpired(callId: string): Promise<boolean> {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call || call.status !== 'pending') {
      return false;
    }

    const timeoutThreshold = new Date(Date.now() - PENDING_CALL_TIMEOUT_MINUTES * 60 * 1000);
    return call.requestedAt < timeoutThreshold;
  }

  /**
   * Cleanup stale accepted calls that were never started
   * These calls should have their holds released
   */
  static async cleanupStaleAcceptedCalls(): Promise<number> {
    const timeoutThreshold = new Date(Date.now() - ACCEPTED_CALL_TIMEOUT_MINUTES * 60 * 1000);

    const staleCalls = await db.query.calls.findMany({
      where: and(
        eq(calls.status, 'accepted'),
        lt(calls.acceptedAt, timeoutThreshold)
      ),
    });

    let cleanedCount = 0;

    for (const call of staleCalls) {
      try {
        // Release the hold
        if (call.holdId) {
          try {
            await WalletService.releaseHold(call.holdId);
          } catch (error) {
            console.error(`[CallService] Failed to release hold for stale accepted call ${call.id}:`, error);
          }
        }

        // Mark as cancelled
        await db
          .update(calls)
          .set({
            status: 'cancelled',
            cancellationReason: 'Call was accepted but never started (auto-cancelled)',
            updatedAt: new Date(),
          })
          .where(eq(calls.id, call.id));

        cleanedCount++;
        console.log(`[CallService] Auto-cancelled stale accepted call ${call.id}`);
      } catch (error) {
        console.error(`[CallService] Failed to cleanup stale accepted call ${call.id}:`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * Cleanup stale active calls that exceeded maximum duration
   * These calls will be forcibly ended and billed based on duration
   */
  static async cleanupStaleActiveCalls(): Promise<number> {
    const maxDurationThreshold = new Date(Date.now() - ACTIVE_CALL_MAX_DURATION_MINUTES * 60 * 1000);

    const staleCalls = await db.query.calls.findMany({
      where: and(
        eq(calls.status, 'active'),
        lt(calls.startedAt, maxDurationThreshold)
      ),
    });

    let cleanedCount = 0;

    for (const call of staleCalls) {
      try {
        // Use endCall to properly bill the call
        // We pass the creator ID so either party can end
        await this.endCall(call.id, call.creatorId);
        cleanedCount++;
        console.log(`[CallService] Force-ended stale active call ${call.id} (exceeded ${ACTIVE_CALL_MAX_DURATION_MINUTES} min)`);
      } catch (error) {
        console.error(`[CallService] Failed to force-end stale active call ${call.id}:`, error);
      }
    }

    return cleanedCount;
  }

  /**
   * Run all cleanup tasks (call this from cron)
   */
  static async runAllCleanup(): Promise<{ pending: number; accepted: number; active: number }> {
    const [pending, accepted, active] = await Promise.all([
      this.cleanupExpiredCalls(),
      this.cleanupStaleAcceptedCalls(),
      this.cleanupStaleActiveCalls(),
    ]);

    if (pending > 0 || accepted > 0 || active > 0) {
      console.log(`[CallService] Cleanup complete: ${pending} pending, ${accepted} accepted, ${active} active calls cleaned`);
    }

    return { pending, accepted, active };
  }
}
