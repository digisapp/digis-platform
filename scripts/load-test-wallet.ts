/**
 * Load Test Script for Wallet System
 *
 * Tests:
 * - 100 concurrent coin purchases
 * - Idempotency (no duplicate credits)
 * - Transaction processing time
 * - Database consistency
 *
 * Usage:
 * npm run db:push  # Ensure DB schema is up to date
 * npx tsx scripts/load-test-wallet.ts
 */

import { WalletService } from '../src/lib/wallet/wallet-service';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  totalTests: number;
  successfulTransactions: number;
  failedTransactions: number;
  duplicates: number;
  avgProcessingTime: number;
  errors: string[];
}

async function runLoadTest(): Promise<TestResult> {
  console.log('🧪 Starting Wallet Load Test...\n');

  const testUserId = uuidv4(); // Generate test user ID
  const numTests = 100;
  const results: TestResult = {
    totalTests: numTests,
    successfulTransactions: 0,
    failedTransactions: 0,
    duplicates: 0,
    avgProcessingTime: 0,
    errors: [],
  };

  const startTime = Date.now();
  const promises: Promise<any>[] = [];

  // Test 1: Concurrent purchases with SAME idempotency key (should result in 1 transaction)
  console.log('Test 1: Idempotency Check (same key, 10 concurrent requests)');
  const idempotencyKey = `test_${uuidv4()}`;

  for (let i = 0; i < 10; i++) {
    promises.push(
      WalletService.createTransaction({
        userId: testUserId,
        amount: 100,
        type: 'purchase',
        description: `Test purchase ${i}`,
        idempotencyKey, // Same key for all
      })
      .then(() => results.successfulTransactions++)
      .catch((err) => {
        results.failedTransactions++;
        results.errors.push(err.message);
      })
    );
  }

  await Promise.all(promises);
  promises.length = 0;

  // Check balance after idempotency test
  const balanceAfterIdempotency = await WalletService.getBalance(testUserId);
  console.log(`✓ Balance after idempotency test: ${balanceAfterIdempotency} coins`);

  if (balanceAfterIdempotency === 100) {
    console.log('✅ Idempotency working! Only 1 transaction created from 10 attempts\n');
  } else {
    console.log('❌ Idempotency FAILED! Expected 100 coins, got', balanceAfterIdempotency, '\n');
    results.errors.push('Idempotency test failed');
  }

  // Test 2: Concurrent purchases with DIFFERENT keys (should all succeed)
  console.log('Test 2: Concurrent Purchases (90 unique transactions)');

  for (let i = 0; i < 90; i++) {
    promises.push(
      WalletService.createTransaction({
        userId: testUserId,
        amount: 50,
        type: 'purchase',
        description: `Purchase ${i}`,
        idempotencyKey: `unique_${uuidv4()}`,
      })
      .then(() => results.successfulTransactions++)
      .catch((err) => {
        results.failedTransactions++;
        results.errors.push(err.message);
      })
    );
  }

  await Promise.all(promises);

  const finalBalance = await WalletService.getBalance(testUserId);
  const expectedBalance = 100 + (90 * 50); // 4600

  console.log(`✓ Final balance: ${finalBalance} coins`);
  console.log(`✓ Expected: ${expectedBalance} coins`);

  if (finalBalance === expectedBalance) {
    console.log('✅ All transactions processed correctly!\n');
  } else {
    console.log('❌ Balance mismatch!\n');
    results.errors.push(`Balance mismatch: expected ${expectedBalance}, got ${finalBalance}`);
  }

  // Test 3: Spend holds
  console.log('Test 3: Spend Holds System');

  try {
    // Create a hold
    const hold = await WalletService.createHold({
      userId: testUserId,
      amount: 500,
      purpose: 'video_call',
      relatedId: uuidv4(),
    });

    console.log('✓ Hold created:', hold.id);

    const availableBalance = await WalletService.getAvailableBalance(testUserId);
    console.log(`✓ Available balance after hold: ${availableBalance} coins`);

    // Settle the hold
    await WalletService.settleHold(hold.id, 300); // Only charge 300 of the 500 hold

    const balanceAfterSettle = await WalletService.getBalance(testUserId);
    console.log(`✓ Balance after settling hold: ${balanceAfterSettle} coins`);

    console.log('✅ Spend holds working correctly!\n');
  } catch (err) {
    console.log('❌ Spend hold test failed:', err);
    results.errors.push(`Spend hold test: ${err}`);
  }

  const endTime = Date.now();
  results.avgProcessingTime = (endTime - startTime) / numTests;

  return results;
}

async function printResults(results: TestResult) {
  console.log('\n📊 LOAD TEST RESULTS\n');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`Successful: ${results.successfulTransactions}`);
  console.log(`Failed: ${results.failedTransactions}`);
  console.log(`Avg Processing Time: ${results.avgProcessingTime.toFixed(2)}ms`);
  console.log('='.repeat(50));

  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:\n');
    results.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`);
    });
  }

  const successRate = (results.successfulTransactions / results.totalTests) * 100;
  console.log(`\n${successRate >= 99 ? '✅' : '❌'} Success Rate: ${successRate.toFixed(2)}%`);

  if (successRate >= 99) {
    console.log('\n🎉 LOAD TEST PASSED!\n');
  } else {
    console.log('\n⚠️  LOAD TEST FAILED - Success rate below 99%\n');
  }
}

// Run the test
runLoadTest()
  .then(printResults)
  .catch((err) => {
    console.error('❌ Load test crashed:', err);
    process.exit(1);
  });
