/**
 * Generate a secure encryption key for bank account encryption
 *
 * Usage:
 *   npx tsx scripts/generate-encryption-key.ts
 *
 * Then add the generated key to your .env file:
 *   ENCRYPTION_KEY=<generated_key>
 */

import crypto from 'crypto';

function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

console.log('\n🔐 Generating AES-256 Encryption Key...\n');

const key = generateEncryptionKey();

console.log('✅ Key generated successfully!\n');
console.log('Add this to your .env file:\n');
console.log(`ENCRYPTION_KEY=${key}\n`);
console.log('⚠️  IMPORTANT:');
console.log('1. Keep this key SECRET and secure');
console.log('2. Never commit it to git');
console.log('3. Add it to .env.local for development');
console.log('4. Add it to Vercel environment variables for production');
console.log('5. If you lose this key, you CANNOT decrypt existing data!\n');
