/**
 * Add coins to a user's wallet
 *
 * Usage:
 * npx tsx scripts/add-coins.ts <userId> <amount>
 *
 * Example:
 * npx tsx scripts/add-coins.ts user_c7584b94 500000
 */

import { WalletService } from '../src/lib/wallet/wallet-service';
import { db } from '../src/lib/data/system';
import { users } from '../src/lib/data/system';
import { eq, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function addCoins() {
  const identifier = process.argv[2];
  const amount = parseInt(process.argv[3], 10);

  if (!identifier || !amount || isNaN(amount)) {
    console.log('Usage: npx tsx scripts/add-coins.ts <email or username> <amount>');
    console.log('Example: npx tsx scripts/add-coins.ts nathanmayell@gmail.com 500000');
    process.exit(1);
  }

  console.log(`\nAdding ${amount.toLocaleString()} coins to user ${identifier}...\n`);

  try {
    // Look up user by email or username
    const user = await db.query.users.findFirst({
      where: or(
        eq(users.email, identifier),
        eq(users.username, identifier.toLowerCase())
      ),
    });

    if (!user) {
      console.error(`User ${identifier} not found!`);
      process.exit(1);
    }

    const userId = user.id;
    console.log(`Found user: ${user.username || user.email} (ID: ${userId})`);

    // Get current balance
    const currentBalance = await WalletService.getBalance(userId);
    console.log(`Current balance: ${currentBalance.toLocaleString()} coins`);

    // Add coins (using 'purchase' type as it's the standard way to credit coins)
    await WalletService.createTransaction({
      userId,
      amount,
      type: 'purchase',
      description: `Admin credit: ${amount.toLocaleString()} coins`,
      idempotencyKey: `admin_credit_${userId}_${Date.now()}`,
    });

    // Get new balance
    const newBalance = await WalletService.getBalance(userId);
    console.log(`New balance: ${newBalance.toLocaleString()} coins`);

    console.log(`\n${amount.toLocaleString()} coins added successfully!`);
  } catch (error) {
    console.error('Error adding coins:', error);
    process.exit(1);
  }

  process.exit(0);
}

addCoins();
