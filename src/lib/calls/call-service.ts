import { db } from '@/db';
import { calls, creatorSettings } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { WalletService } from '@/lib/wallet/wallet-service';
import { v4 as uuidv4 } from 'uuid';

export class CallService {
  /**
   * Initiate a call request
   * - Checks creator availability
   * - Calculates estimated cost
   * - Creates hold for estimated amount
   * - Creates call record
   */
  static async initiateCall(params: {
    fanId: string;
    creatorId: string;
    estimatedMinutes?: number;
  }) {
    const { fanId, creatorId, estimatedMinutes = 30 } = params;

    return await db.transaction(async (tx) => {
      // Get creator's call rate
      const settings = await tx.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, creatorId),
      });

      if (!settings) {
        throw new Error('Creator settings not found');
      }

      if (!settings.isAvailableForCalls) {
        throw new Error('Creator is not available for calls');
      }

      const ratePerMinute = settings.callRatePerMinute;
      const minimumMinutes = settings.minimumCallDuration;
      const estimatedDuration = Math.max(estimatedMinutes, minimumMinutes);
      const estimatedCoins = estimatedDuration * ratePerMinute;

      // Create hold for estimated amount
      const hold = await WalletService.createHold({
        userId: fanId,
        amount: estimatedCoins,
        purpose: 'video_call',
      });

      // Create call record
      const roomName = `call_${uuidv4()}`;
      const [call] = await tx
        .insert(calls)
        .values({
          fanId,
          creatorId,
          status: settings.autoAcceptCalls ? 'accepted' : 'pending',
          ratePerMinute,
          estimatedCoins,
          holdId: hold.id,
          roomName,
        })
        .returning();

      // Update hold with call ID
      // (In a real app, you'd have a foreign key relationship)

      return call;
    });
  }

  /**
   * Creator accepts a pending call
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
      throw new Error('Call is not in pending status');
    }

    const [updatedCall] = await db
      .update(calls)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updatedCall;
  }

  /**
   * Reject a call request
   */
  static async rejectCall(callId: string, creatorId: string, reason?: string) {
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
      throw new Error('Call is not in pending status');
    }

    return await db.transaction(async (tx) => {
      // Release the hold
      if (call.holdId) {
        await WalletService.releaseHold(call.holdId);
      }

      // Update call status
      const [updatedCall] = await tx
        .update(calls)
        .set({
          status: 'rejected',
          cancelledBy: creatorId,
          cancellationReason: reason || 'Creator rejected',
          updatedAt: new Date(),
        })
        .where(eq(calls.id, callId))
        .returning();

      return updatedCall;
    });
  }

  /**
   * Start a call (both parties joined the room)
   */
  static async startCall(callId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.status !== 'accepted') {
      throw new Error('Call must be accepted before starting');
    }

    const [updatedCall] = await db
      .update(calls)
      .set({
        status: 'active',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(calls.id, callId))
      .returning();

    return updatedCall;
  }

  /**
   * End a call and process billing
   */
  static async endCall(callId: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.status !== 'active') {
      throw new Error('Call is not active');
    }

    if (!call.startedAt) {
      throw new Error('Call has no start time');
    }

    const startTime = call.startedAt; // Store for TypeScript

    return await db.transaction(async (tx) => {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationSeconds = Math.floor(durationMs / 1000);
      const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to nearest minute

      // Calculate actual cost
      const actualCoins = durationMinutes * call.ratePerMinute;

      // Settle the hold with actual amount
      if (call.holdId) {
        await WalletService.settleHold(call.holdId, actualCoins);
      }

      // Update call record
      const [updatedCall] = await tx
        .update(calls)
        .set({
          status: 'completed',
          endedAt: endTime,
          durationSeconds,
          actualCoins,
          updatedAt: new Date(),
        })
        .where(eq(calls.id, callId))
        .returning();

      return updatedCall;
    });
  }

  /**
   * Cancel a call before it starts
   */
  static async cancelCall(callId: string, userId: string, reason?: string) {
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.fanId !== userId && call.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    if (!['pending', 'accepted'].includes(call.status)) {
      throw new Error('Cannot cancel call in current status');
    }

    return await db.transaction(async (tx) => {
      // Release the hold
      if (call.holdId) {
        await WalletService.releaseHold(call.holdId);
      }

      // Update call status
      const [updatedCall] = await tx
        .update(calls)
        .set({
          status: 'cancelled',
          cancelledBy: userId,
          cancellationReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(calls.id, callId))
        .returning();

      return updatedCall;
    });
  }

  /**
   * Get call history for a user
   */
  static async getCallHistory(userId: string, limit: number = 50) {
    return await db.query.calls.findMany({
      where: or(
        eq(calls.fanId, userId),
        eq(calls.creatorId, userId)
      ),
      orderBy: [desc(calls.createdAt)],
      limit,
    });
  }

  /**
   * Get pending calls for a creator
   */
  static async getPendingCalls(creatorId: string) {
    return await db.query.calls.findMany({
      where: and(
        eq(calls.creatorId, creatorId),
        eq(calls.status, 'pending')
      ),
      orderBy: [desc(calls.requestedAt)],
    });
  }

  /**
   * Get active call for a user
   */
  static async getActiveCall(userId: string) {
    return await db.query.calls.findFirst({
      where: and(
        or(
          eq(calls.fanId, userId),
          eq(calls.creatorId, userId)
        ),
        eq(calls.status, 'active')
      ),
    });
  }

  /**
   * Create or update creator settings
   */
  static async updateCreatorSettings(userId: string, settings: {
    callRatePerMinute?: number;
    minimumCallDuration?: number;
    isAvailableForCalls?: boolean;
    autoAcceptCalls?: boolean;
  }) {
    // Try to find existing settings
    const existing = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, userId),
    });

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(creatorSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(creatorSettings.userId, userId))
        .returning();

      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(creatorSettings)
        .values({
          userId,
          ...settings,
        })
        .returning();

      return created;
    }
  }

  /**
   * Get creator settings
   */
  static async getCreatorSettings(userId: string) {
    return await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, userId),
    });
  }
}
