/**
 * Create missing AI Twin settings for all creators
 * Run with: npx tsx scripts/fix-ai-twin.ts
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

async function fixAllCreators() {
  console.log('═'.repeat(60));
  console.log('🔧 CREATING MISSING AI TWIN SETTINGS');
  console.log('═'.repeat(60));

  // Get all creators
  const creators = await db.query.users.findMany({
    where: eq(schema.users.role, 'creator'),
  });

  console.log(`\nFound ${creators.length} creators\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const creator of creators) {
    const existing = await db.query.aiTwinSettings.findFirst({
      where: eq(schema.aiTwinSettings.creatorId, creator.id),
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      await db.insert(schema.aiTwinSettings).values({
        creatorId: creator.id,
        enabled: false,
        textChatEnabled: false,
        voice: 'ara',
        pricePerMinute: 20,
        minimumMinutes: 5,
        maxSessionMinutes: 60,
        textPricePerMessage: 5,
      });
      created++;
      console.log(`✅ Created settings for @${creator.username}`);
    } catch (err: any) {
      errors++;
      console.log(`❌ Failed for @${creator.username}: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));
  console.log(`Created: ${created}`);
  console.log(`Skipped (already existed): ${skipped}`);
  console.log(`Errors: ${errors}`);

  await sql.end();
}

fixAllCreators().catch(console.error);
