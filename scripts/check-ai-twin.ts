/**
 * Check and report AI Twin settings for all creators
 * Run with: npx tsx scripts/check-ai-twin.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function checkAllCreators() {
  console.log('═'.repeat(60));
  console.log('🤖 AI TWIN SETTINGS CHECK FOR ALL CREATORS');
  console.log('═'.repeat(60));

  // Get all creators
  const creators = await db.query.users.findMany({
    where: eq(schema.users.role, 'creator'),
  });

  console.log(`\nFound ${creators.length} creators\n`);

  const issues: { username: string; issue: string }[] = [];
  const stats = {
    total: creators.length,
    withSettings: 0,
    voiceEnabled: 0,
    textEnabled: 0,
    noSettings: 0,
  };

  for (const creator of creators) {
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(schema.aiTwinSettings.creatorId, creator.id),
    });

    if (!settings) {
      stats.noSettings++;
      issues.push({ username: creator.username || 'unknown', issue: 'No AI Twin settings record' });
      console.log(`❌ @${creator.username}: No AI Twin settings`);
    } else {
      stats.withSettings++;
      if (settings.enabled) stats.voiceEnabled++;
      if (settings.textChatEnabled) stats.textEnabled++;
      
      const voiceStatus = settings.enabled ? '✅ Voice ON' : '⬜ Voice OFF';
      const textStatus = settings.textChatEnabled ? '✅ Text ON' : '⬜ Text OFF';
      console.log(`   @${creator.username}: ${voiceStatus} | ${textStatus}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total creators: ${stats.total}`);
  console.log(`With AI settings: ${stats.withSettings}`);
  console.log(`Missing AI settings: ${stats.noSettings}`);
  console.log(`Voice enabled: ${stats.voiceEnabled}`);
  console.log(`Text enabled: ${stats.textEnabled}`);

  if (issues.length > 0) {
    console.log('\n⚠️  ISSUES FOUND:');
    issues.forEach(i => console.log(`   - @${i.username}: ${i.issue}`));
  }

  await sql.end();
}

checkAllCreators().catch(console.error);
