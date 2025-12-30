import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function fullCheck() {
  const username = process.argv[2] || 'ayannaverrelli';

  console.log('═'.repeat(60));
  console.log(`🔍 FULL CHECK FOR @${username}`);
  console.log('═'.repeat(60));

  // 1. Database user record
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
  });

  if (!user) {
    console.log('❌ USER NOT FOUND IN DATABASE');
    await sql.end();
    return;
  }

  console.log('\n📋 DATABASE USER RECORD:');
  console.log('   ID:', user.id);
  console.log('   Username:', user.username);
  console.log('   Email:', user.email);
  console.log('   Role:', user.role, user.role === 'creator' ? '✅' : '❌ WRONG!');
  console.log('   isCreatorVerified:', user.isCreatorVerified, user.isCreatorVerified ? '✅' : '❌');
  console.log('   Created:', user.createdAt);
  console.log('   Last Seen:', user.lastSeenAt);

  // 2. Supabase Auth metadata
  console.log('\n📋 SUPABASE AUTH METADATA:');
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(user.id);

  if (authError) {
    console.log('   ❌ Error fetching auth user:', authError.message);
  } else if (authUser?.user) {
    const appMeta = authUser.user.app_metadata || {};
    const userMeta = authUser.user.user_metadata || {};
    console.log('   app_metadata.role:', appMeta.role, appMeta.role === 'creator' ? '✅' : '❌ MISSING/WRONG');
    console.log('   user_metadata.is_creator_verified:', userMeta.is_creator_verified);
    console.log('   Email confirmed:', authUser.user.email_confirmed_at ? '✅' : '❌ NOT CONFIRMED');
    console.log('   Last sign in:', authUser.user.last_sign_in_at);
  }

  // 3. Creator settings
  console.log('\n📋 CREATOR SETTINGS:');
  const creatorSettings = await db.query.creatorSettings.findFirst({
    where: eq(schema.creatorSettings.userId, user.id),
  });

  if (creatorSettings) {
    console.log('   ✅ Creator settings exist');
    console.log('   Message rate:', creatorSettings.messageRate);
    console.log('   Call rate:', creatorSettings.callRatePerMinute);
  } else {
    console.log('   ❌ NO CREATOR SETTINGS - This would cause issues!');
  }

  // 4. AI Twin settings
  console.log('\n📋 AI TWIN SETTINGS:');
  const aiSettings = await db.query.aiTwinSettings.findFirst({
    where: eq(schema.aiTwinSettings.creatorId, user.id),
  });

  if (aiSettings) {
    console.log('   ✅ AI Twin settings exist');
    console.log('   ID:', aiSettings.id);
    console.log('   Voice Enabled:', aiSettings.enabled);
    console.log('   Text Chat Enabled:', aiSettings.textChatEnabled);
    console.log('   Voice:', aiSettings.voice);
    console.log('   Price/min:', aiSettings.pricePerMinute);
    console.log('   Text price/msg:', aiSettings.textPricePerMessage);
    console.log('   Updated:', aiSettings.updatedAt);
  } else {
    console.log('   ⚠️ No AI Twin settings yet (will be created on first save)');
  }

  // 5. Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));

  const issues: string[] = [];
  if (user.role !== 'creator') issues.push('DB role is not creator');
  if (!user.isCreatorVerified) issues.push('Not verified in DB');
  if (authUser?.user?.app_metadata?.role !== 'creator') issues.push('Auth metadata role is not creator');
  if (!creatorSettings) issues.push('Missing creator_settings');

  if (issues.length === 0) {
    console.log('✅ ALL CHECKS PASSED - Creator should be able to use AI Twin');
    console.log('\nIf still failing, the creator should:');
    console.log('   1. Log out completely');
    console.log('   2. Clear browser cache or use incognito');
    console.log('   3. Log back in');
    console.log('   4. Try saving AI Twin settings');
  } else {
    console.log('❌ ISSUES FOUND:');
    issues.forEach(i => console.log('   -', i));
  }

  await sql.end();
}

fullCheck().catch(console.error);
