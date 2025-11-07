import { db } from '@/lib/data/system';
import { calls, creatorSettings, users, spendHolds, walletTransactions, wallets } from '@/lib/data/system';
import { eq, and, or, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export class CallService {
  /**
   * Get or create creator settings
   */
  static async getCreatorSettings(userId: string) {
    let settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, userId),
    });

    // Create default settings if they don't exist
    if (!settings) {
      const [newSettings] = await db
        .insert(creatorSettings)
        .values({
          userId,
          callRatePerMinute: 10, // Default 10 coins/min
          minimumCallDuration: 5, // Default 5 min minimum
          isAvailableForCalls: true,
          autoAcceptCalls: false,
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
  static async requestCall(fanId: string, creatorId: string) {
    // Get creator settings
    const settings = await this.getCreatorSettings(creatorId);

    if (!settings.isAvailableForCalls) {
      throw new Error('Creator is not available for calls');
    }

    // Get fan's wallet balance
    const fanWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, fanId),
    });

    if (!fanWallet) {
      throw new Error('Wallet not found');
    }

    // Calculate estimated coins for minimum duration
    const estimatedCoins = settings.callRatePerMinute * settings.minimumCallDuration;

    // Check if fan has enough coins
    const availableBalance = fanWallet.balance - fanWallet.heldBalance;
    if (availableBalance < estimatedCoins) {
      throw new Error(`Insufficient balance. Need at least ${estimatedCoins} coins for a ${settings.minimumCallDuration} minute call.`);
    }

    // Create spend hold for estimated amount
    const [hold] = await db
      .insert(spendHolds)
      .values({
        userId: fanId,
        amount: estimatedCoins,
        purpose: 'video_call',
        status: 'active',
      })
      .returning();

    // Update wallet held balance
    await db
      .update(wallets)
      .set({
        heldBalance: fanWallet.heldBalance + estimatedCoins,
      })
      .where(eq(wallets.userId, fanId));

    // Create call request
    const roomName = `call-${nanoid(16)}`;

    const [call] = await db
      .insert(calls)
      .values({
        fanId,
        creatorId,
        status: settings.autoAcceptCalls ? 'accepted' : 'pending',
        ratePerMinute: settings.callRatePerMinute,
        estimatedCoins,
        roomName,
        holdId: hold.id,
        acceptedAt: settings.autoAcceptCalls ? new Date() : null,
      })
      .returning();

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

    // Release the hold
    if (call.holdId) {
      await db
        .update(spendHolds)
        .set({
          status: 'released',
          releasedAt: new Date(),
        })
        .where(eq(spendHolds.id, call.holdId));

      // Update fan's held balance
      const fanWallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, call.fanId),
      });

      if (fanWallet) {
        await db
          .update(wallets)
          .set({
            heldBalance: Math.max(0, fanWallet.heldBalance - (call.estimatedCoins || 0)),
          })
          .where(eq(wallets.userId, call.fanId));
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

    if (call.status !== 'active') {
      throw new Error('Call is not active');
    }

    if (!call.startedAt) {
      throw new Error('Call start time not recorded');
    }

    // Calculate duration
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - call.startedAt.getTime()) / 1000);
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Calculate actual charge
    const actualCoins = call.ratePerMinute * durationMinutes;

    // Settle the hold and process payment
    if (call.holdId) {
      const transactionId = `call-${callId}-${nanoid(8)}`;

      // Settle the hold
      await db
        .update(spendHolds)
        .set({
          status: 'settled',
          settledAt: new Date(),
        })
        .where(eq(spendHolds.id, call.holdId));

      // Process the actual charge
      // Debit fan
      await db.insert(walletTransactions).values({
        userId: call.fanId,
        amount: -actualCoins,
        type: 'call_charge',
        status: 'completed',
        description: `Video call (${durationMinutes} min)`,
        idempotencyKey: `${transactionId}-debit`,
        metadata: JSON.stringify({ callId, durationMinutes }),
      });

      // Credit creator (platform takes 0% for now, can add commission later)
      await db.insert(walletTransactions).values({
        userId: call.creatorId,
        amount: actualCoins,
        type: 'call_earnings',
        status: 'completed',
        description: `Call earnings (${durationMinutes} min)`,
        idempotencyKey: `${transactionId}-credit`,
        metadata: JSON.stringify({ callId, durationMinutes }),
      });

      // Release any remaining held amount
      const refundAmount = Math.max(0, (call.estimatedCoins || 0) - actualCoins);
      if (refundAmount > 0) {
        const fanWallet = await db.query.wallets.findFirst({
          where: eq(wallets.userId, call.fanId),
        });

        if (fanWallet) {
          await db
            .update(wallets)
            .set({
              heldBalance: Math.max(0, fanWallet.heldBalance - (call.estimatedCoins || 0)),
            })
            .where(eq(wallets.userId, call.fanId));
        }
      }
    }

    // Update call
    const [updated] = await db
      .update(calls)
      .set({
        status: 'completed',
        endedAt: endTime,
        durationSeconds,
        actualCoins,
        updatedAt: endTime,
      })
      .where(eq(calls.id, callId))
      .returning();

    return updated;
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
}
