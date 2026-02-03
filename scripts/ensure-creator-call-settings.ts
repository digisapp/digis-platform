/**
 * Script to ensure all creators have call settings with calls enabled by default
 * Run with: npx tsx scripts/ensure-creator-call-settings.ts
 */

import { db, users, creatorSettings } from '../src/lib/data/system';
import { eq, isNull, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Ensuring all creators have call settings...\n');

  // 1. Find all creators
  const creators = await db.query.users.findMany({
    where: eq(users.role, 'creator'),
    columns: { id: true, username: true },
  });

  console.log(`Found ${creators.length} creators\n`);

  let created = 0;
  let updated = 0;
  let alreadyOk = 0;

  for (const creator of creators) {
    // Check if they have settings
    const settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, creator.id),
    });

    if (!settings) {
      // Create default settings with calls ON
      await db.insert(creatorSettings).values({
        userId: creator.id,
        callRatePerMinute: 25,
        minimumCallDuration: 5,
        voiceCallRatePerMinute: 15,
        minimumVoiceCallDuration: 5,
        messageRate: 3,
        isAvailableForCalls: true,
        isAvailableForVoiceCalls: true,
      });
      console.log(`✅ Created settings for @${creator.username} (calls ON)`);
      created++;
    } else if (!settings.isAvailableForCalls || !settings.isAvailableForVoiceCalls) {
      // Update existing settings to have calls ON
      await db
        .update(creatorSettings)
        .set({
          isAvailableForCalls: true,
          isAvailableForVoiceCalls: true,
          updatedAt: new Date(),
        })
        .where(eq(creatorSettings.userId, creator.id));
      console.log(`🔄 Updated @${creator.username}: video=${settings.isAvailableForCalls}→true, voice=${settings.isAvailableForVoiceCalls}→true`);
      updated++;
    } else {
      alreadyOk++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Already OK: ${alreadyOk}`);
  console.log('\nDone!');

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
