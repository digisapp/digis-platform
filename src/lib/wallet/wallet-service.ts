import { db } from '@/db';
import { wallets, walletTransactions, spendHolds } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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
   */
  static async getBalance(userId: string): Promise<number> {
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      await this.createWallet(userId);
      return 0;
    }

    return wallet.balance;
  }

  /**
   * Get available balance (balance - held balance)
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
   */
  static async settleHold(holdId: string, actualAmount?: number) {
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

      // Create the actual transaction
      await this.createTransaction({
        userId: hold.userId,
        amount: -amountToSettle,
        type: hold.purpose.includes('call') ? 'call_charge' : 'stream_tip',
        description: `Settled hold for ${hold.purpose}`,
        metadata: { holdId },
        idempotencyKey: `settle_${holdId}`,
      });

      // Update hold status
      await tx
        .update(spendHolds)
        .set({
          status: 'settled',
          settledAt: new Date(),
        })
        .where(eq(spendHolds.id, holdId));

      // Release the held amount
      await tx
        .update(wallets)
        .set({
          heldBalance: sql`${wallets.heldBalance} - ${hold.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, hold.userId));

      // If actual amount is less than hold, refund the difference
      if (actualAmount && actualAmount < hold.amount) {
        const refundAmount = hold.amount - actualAmount;
        // Balance already adjusted by settling, just log it
        console.log(`Refunded ${refundAmount} coins from hold ${holdId}`);
      }
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
