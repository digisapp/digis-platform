#!/usr/bin/env tsx
/**
 * Environment Check Script
 *
 * Verifies that all required environment variables are properly configured
 * for the role persistence system to work correctly.
 *
 * Run with: npx tsx scripts/check-env.ts
 */

import { supabaseAdmin } from '../src/lib/supabase/admin';

async function checkEnvironment() {
  console.log('🔍 Checking environment configuration...\n');

  const checks = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  // Check 1: NEXT_PUBLIC_SUPABASE_URL
  console.log('1️⃣  Checking NEXT_PUBLIC_SUPABASE_URL...');
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('   ✅ Found:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    checks.passed++;
  } else {
    console.log('   ❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    checks.failed++;
  }

  // Check 2: SUPABASE_SERVICE_ROLE_KEY
  console.log('\n2️⃣  Checking SUPABASE_SERVICE_ROLE_KEY...');
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('   ✅ Found:', key.substring(0, 20) + '...' + key.substring(key.length - 10));

    // Verify it's a service role key (should start with eyJ)
    if (key.startsWith('eyJ')) {
      console.log('   ✅ Format looks correct (JWT)');
    } else {
      console.log('   ⚠️  Warning: Should be a JWT token starting with eyJ');
      checks.warnings++;
    }
    checks.passed++;
  } else {
    console.log('   ❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    checks.failed++;
  }

  // Check 3: DATABASE_URL
  console.log('\n3️⃣  Checking DATABASE_URL...');
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    console.log('   ✅ Found');

    // Check for transaction pooler (port 6543)
    if (dbUrl.includes(':6543')) {
      console.log('   ✅ Using transaction pooler (port 6543) - recommended for Vercel');
    } else if (dbUrl.includes(':5432')) {
      console.log('   ⚠️  Using direct connection (port 5432)');
      console.log('   💡 Recommendation: Use transaction pooler on port 6543 for Vercel');
      checks.warnings++;
    }
    checks.passed++;
  } else {
    console.log('   ❌ Missing DATABASE_URL');
    checks.failed++;
  }

  // Check 4: Test admin client connection
  console.log('\n4️⃣  Testing Supabase Admin Client...');
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      console.log('   ❌ Admin client test failed:', error.message);
      checks.failed++;
    } else {
      console.log('   ✅ Admin client working correctly');
      checks.passed++;
    }
  } catch (err: any) {
    console.log('   ❌ Admin client test failed:', err.message);
    checks.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Environment Check Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed:   ${checks.passed}`);
  console.log(`⚠️  Warnings: ${checks.warnings}`);
  console.log(`❌ Failed:   ${checks.failed}`);
  console.log('='.repeat(60) + '\n');

  if (checks.failed > 0) {
    console.log('❌ Environment check failed. Please fix the issues above.');
    console.log('\n📚 Setup guide:');
    console.log('   1. Copy .env.example to .env.local');
    console.log('   2. Fill in all required values from Supabase dashboard');
    console.log('   3. For Vercel: Add these to environment variables in dashboard\n');
    process.exit(1);
  } else if (checks.warnings > 0) {
    console.log('⚠️  Environment check passed with warnings.');
    console.log('💡 Consider addressing warnings for optimal performance.\n');
    process.exit(0);
  } else {
    console.log('🎉 All environment checks passed!');
    console.log('✨ System is ready for role persistence.\n');
    process.exit(0);
  }
}

// Run the check
checkEnvironment().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
