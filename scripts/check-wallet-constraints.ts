/**
 * Script to check for wallet rows that would violate the new CHECK constraints.
 * Run this BEFORE applying the migration with `npx drizzle-kit push`.
 *
 * Usage: DATABASE_URL="your-connection-string" npx tsx scripts/check-wallet-constraints.ts
 */

import { db } from '../src/lib/data/system';
import { wallets } from '../src/lib/data/system';
import { sql, lt, gt } from 'drizzle-orm';

async function checkConstraintViolations() {
  console.log('Checking for wallet constraint violations...\n');

  // Check for negative balances
  const negativeBalances = await db
    .select({
      id: wallets.id,
      userId: wallets.userId,
      balance: wallets.balance,
      heldBalance: wallets.heldBalance,
    })
    .from(wallets)
    .where(lt(wallets.balance, 0));

  if (negativeBalances.length > 0) {
    console.log('❌ FOUND wallets with negative balance:');
    negativeBalances.forEach(w => {
      console.log(`   - Wallet ${w.id}: user=${w.userId}, balance=${w.balance}`);
    });
    console.log('');
  } else {
    console.log('✅ No wallets with negative balance');
  }

  // Check for negative held balances
  const negativeHeldBalances = await db
    .select({
      id: wallets.id,
      userId: wallets.userId,
      balance: wallets.balance,
      heldBalance: wallets.heldBalance,
    })
    .from(wallets)
    .where(lt(wallets.heldBalance, 0));

  if (negativeHeldBalances.length > 0) {
    console.log('❌ FOUND wallets with negative held_balance:');
    negativeHeldBalances.forEach(w => {
      console.log(`   - Wallet ${w.id}: user=${w.userId}, held_balance=${w.heldBalance}`);
    });
    console.log('');
  } else {
    console.log('✅ No wallets with negative held_balance');
  }

  // Check for held_balance > balance
  const heldExceedsBalance = await db
    .select({
      id: wallets.id,
      userId: wallets.userId,
      balance: wallets.balance,
      heldBalance: wallets.heldBalance,
    })
    .from(wallets)
    .where(gt(wallets.heldBalance, wallets.balance));

  if (heldExceedsBalance.length > 0) {
    console.log('❌ FOUND wallets where held_balance > balance:');
    heldExceedsBalance.forEach(w => {
      console.log(`   - Wallet ${w.id}: user=${w.userId}, balance=${w.balance}, held_balance=${w.heldBalance}`);
    });
    console.log('');
  } else {
    console.log('✅ No wallets with held_balance > balance');
  }

  // Summary
  console.log('\n--- SUMMARY ---');
  const totalViolations = negativeBalances.length + negativeHeldBalances.length + heldExceedsBalance.length;

  if (totalViolations === 0) {
    console.log('✅ All checks passed! Safe to apply constraints.');
    console.log('\nRun: npx drizzle-kit push');
  } else {
    console.log(`❌ Found ${totalViolations} constraint violation(s).`);
    console.log('Fix these before running the migration, or the migration will fail.');
    console.log('\nExample fix queries:');
    console.log('  -- Fix negative balances (set to 0):');
    console.log('  UPDATE wallets SET balance = 0 WHERE balance < 0;');
    console.log('');
    console.log('  -- Fix negative held balances:');
    console.log('  UPDATE wallets SET held_balance = 0 WHERE held_balance < 0;');
    console.log('');
    console.log('  -- Fix held_balance > balance (cap held_balance):');
    console.log('  UPDATE wallets SET held_balance = balance WHERE held_balance > balance;');
    process.exit(1);
  }
}

checkConstraintViolations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error running constraint check:', err);
    process.exit(1);
  });
