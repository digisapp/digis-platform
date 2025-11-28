import { db } from '@/lib/data/system';
import { wallets, walletTransactions, spendHolds, users } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { calculateTier } from '@/lib/tiers/spend-tiers';
import { getCachedBalance, setCachedBalance, invalidateBalanceCache } from '@/lib/cache';

/**
 * WalletService handles all financial transactions using Drizzle ORM.
 *
 * IMPORTANT: This service uses SQL transactions for money operations.
 * All routes using this service MUST export:
 *   export const runtime = 'nodejs';
 *   export const dynamic = 'force-dynamic';
 *
 * Money operations require:
 * - Drizzle transactions (not Supabase REST)
 * - Idempotency keys
 * - Proper error handling and rollback
 */

export type TransactionType = 'purchase' | 'gift' | 'call_charge' | 'stream_tip' | 'ppv_unlock' | 'creator_payout' | 'refund';

interface CreateTransactionParams {
  userId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

interface CreateHoldParams {
  userId: string;
  amount: number;
  purpose: string;
  relatedId?: string;
}

export class WalletService {
  /**
   * Get user's wallet balance
   * Uses Redis cache with 30-second TTL for performance
   */
  static async getBalance(userId: string): Promise<number> {
    // Try cache first
    const cachedBalance = await getCachedBalance(userId);
    if (cachedBalance !== null) {
      return cachedBalance;
    }

    // Cache miss - fetch from database
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      await this.createWallet(userId);
      await setCachedBalance(userId, 0);
      return 0;
    }

    // Cache the balance
    await setCachedBalance(userId, wallet.balance);
    return wallet.balance;
  }

  /**
   * Get available balance (balance - held balance)
   * Note: This always queries DB since held balance changes frequently
   */
  static async getAvailableBalance(userId: string): Promise<number> {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      await this.createWallet(userId);
      return 0;
    }

    return wallet.balance - wallet.heldBalance;
  }

  /**
   * Create a new wallet for a user
   */
  static async createWallet(userId: string) {
    const [wallet] = await db
      .insert(wallets)
      .values({
        userId,
        balance: 0,
        heldBalance: 0,
      })
      .returning();

    return wallet;
  }

  /**
   * Create a transaction with idempotency
   * This implements the double-entry ledger system
   */
  static async createTransaction(params: CreateTransactionParams) {
    const { userId, amount, type, description, metadata, idempotencyKey } = params;

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || uuidv4();

    // Check if transaction already exists (idempotency check)
    const existingTransaction = await db.query.walletTransactions.findFirst({
      where: eq(walletTransactions.idempotencyKey, finalIdempotencyKey),
    });

    if (existingTransaction) {
      console.log('Transaction already exists (idempotent):', finalIdempotencyKey);
      return existingTransaction;
    }

    // Start transaction
    return await db.transaction(async (tx) => {
      // Ensure wallet exists
      let wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet) {
        [wallet] = await tx
          .insert(wallets)
          .values({
            userId,
            balance: 0,
            heldBalance: 0,
          })
          .returning();
      }

      // For debit transactions, check if user has sufficient balance
      if (amount < 0) {
        const availableBalance = wallet.balance - wallet.heldBalance;
        if (availableBalance < Math.abs(amount)) {
          throw new Error('Insufficient balance');
        }
      }

      // Create the transaction
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId,
          amount,
          type,
          status: 'completed',
          description,
          idempotencyKey: finalIdempotencyKey,
          metadata: metadata ? JSON.stringify(metadata) : null,
        })
        .returning();

      // Update wallet balance
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      // Invalidate balance cache after update
      await invalidateBalanceCache(userId);

      // If this is a spending transaction (negative amount), update lifetime spending and tier
      if (amount < 0) {
        const spentAmount = Math.abs(amount);

        // Update lifetime spending
        await tx
          .update(users)
          .set({
            lifetimeSpending: sql`${users.lifetimeSpending} + ${spentAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        // Get updated lifetime spending to recalculate tier
        const updatedUser = await tx.query.users.findFirst({
          where: eq(users.id, userId),
          columns: {
            lifetimeSpending: true,
          },
        });

        if (updatedUser) {
          const newTier = calculateTier(updatedUser.lifetimeSpending);

          // Update tier if it changed
          await tx
            .update(users)
            .set({
              spendTier: newTier,
            })
            .where(eq(users.id, userId));
        }
      }

      return transaction;
    });
  }

  /**
   * Create a spend hold (reserves coins for active calls/streams)
   * This prevents mid-call failures when users run out of coins
   */
  static async createHold(params: CreateHoldParams) {
    const { userId, amount, purpose, relatedId } = params;

    return await db.transaction(async (tx) => {
      // Check available balance
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const availableBalance = wallet.balance - wallet.heldBalance;
      if (availableBalance < amount) {
        throw new Error('Insufficient balance for hold');
      }

      // Create the hold
      const [hold] = await tx
        .insert(spendHolds)
        .values({
          userId,
          amount,
          purpose,
          relatedId,
          status: 'active',
        })
        .returning();

      // Update held balance
      await tx
        .update(wallets)
        .set({
          heldBalance: sql`${wallets.heldBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      return hold;
    });
  }

  /**
   * Settle a hold (convert held coins to actual charge)
   * Called when a call/stream ends successfully
   *
   * IMPORTANT: This uses a single transaction to ensure atomicity.
   * All operations (transaction creation, hold update, balance update) happen together.
   */
  static async settleHold(holdId: string, actualAmount?: number) {
    const idempotencyKey = `settle_${holdId}`;

    // Check if already settled (idempotency)
    const existingTransaction = await db.query.walletTransactions.findFirst({
      where: eq(walletTransactions.idempotencyKey, idempotencyKey),
    });

    if (existingTransaction) {
      console.log('Hold already settled (idempotent):', holdId);
      return existingTransaction;
    }

    return await db.transaction(async (tx) => {
      const hold = await tx.query.spendHolds.findFirst({
        where: eq(spendHolds.id, holdId),
      });

      if (!hold) {
        throw new Error('Hold not found');
      }

      if (hold.status !== 'active') {
        throw new Error('Hold is not active');
      }

      const amountToSettle = actualAmount || hold.amount;
      const transactionType = hold.purpose.includes('call') ? 'call_charge' : 'stream_tip';

      // Get wallet within transaction
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, hold.userId),
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Create the transaction record (within this transaction, not nested)
      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          userId: hold.userId,
          amount: -amountToSettle,
          type: transactionType,
          status: 'completed',
          description: `Settled hold for ${hold.purpose}`,
          idempotencyKey,
          metadata: JSON.stringify({ holdId }),
        })
        .returning();

      // Update wallet balance (deduct the settled amount)
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amountToSettle}`,
          heldBalance: sql`${wallets.heldBalance} - ${hold.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, hold.userId));

      // Invalidate balance cache
      await invalidateBalanceCache(hold.userId);

      // Update hold status
      await tx
        .update(spendHolds)
        .set({
          status: 'settled',
          settledAt: new Date(),
        })
        .where(eq(spendHolds.id, holdId));

      // Update lifetime spending and tier
      await tx
        .update(users)
        .set({
          lifetimeSpending: sql`${users.lifetimeSpending} + ${amountToSettle}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, hold.userId));

      // Get updated lifetime spending to recalculate tier
      const updatedUser = await tx.query.users.findFirst({
        where: eq(users.id, hold.userId),
        columns: { lifetimeSpending: true },
      });

      if (updatedUser) {
        const newTier = calculateTier(updatedUser.lifetimeSpending);
        await tx
          .update(users)
          .set({ spendTier: newTier })
          .where(eq(users.id, hold.userId));
      }

      // If actual amount is less than hold, the difference is automatically returned
      // (we only deducted amountToSettle from balance, but released full hold.amount from heldBalance)
      if (actualAmount && actualAmount < hold.amount) {
        const refundAmount = hold.amount - actualAmount;
        console.log(`Returned ${refundAmount} coins to available balance from hold ${holdId}`);
      }

      return transaction;
    });
  }

  /**
   * Release a hold (cancel without charging)
   * Called when a call is cancelled before starting
   */
  static async releaseHold(holdId: string) {
    return await db.transaction(async (tx) => {
      const hold = await tx.query.spendHolds.findFirst({
        where: eq(spendHolds.id, holdId),
      });

      if (!hold) {
        throw new Error('Hold not found');
      }

      if (hold.status !== 'active') {
        throw new Error('Hold is not active');
      }

      // Update hold status
      await tx
        .update(spendHolds)
        .set({
          status: 'released',
          releasedAt: new Date(),
        })
        .where(eq(spendHolds.id, holdId));

      // Release the held balance
      await tx
        .update(wallets)
        .set({
          heldBalance: sql`${wallets.heldBalance} - ${hold.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, hold.userId));
    });
  }

  /**
   * Get transaction history
   */
  static async getTransactions(userId: string, limit: number = 50) {
    return await db.query.walletTransactions.findMany({
      where: eq(walletTransactions.userId, userId),
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
      limit,
    });
  }

  /**
   * Reconcile wallet balance (for nightly job)
   * Compares calculated balance vs stored balance
   */
  static async reconcileWallet(userId: string) {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      return { status: 'no_wallet' };
    }

    // Calculate actual balance from transactions
    const transactions = await db.query.walletTransactions.findMany({
      where: and(
        eq(walletTransactions.userId, userId),
        eq(walletTransactions.status, 'completed')
      ),
    });

    const calculatedBalance = transactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );

    const discrepancy = wallet.balance - calculatedBalance;

    if (discrepancy !== 0) {
      console.error(`Wallet discrepancy for user ${userId}: ${discrepancy} coins`);
      return { status: 'discrepancy', amount: discrepancy };
    }

    // Update last reconciled timestamp
    await db
      .update(wallets)
      .set({ lastReconciled: new Date() })
      .where(eq(wallets.userId, userId));

    return { status: 'ok', balance: wallet.balance };
  }
}
