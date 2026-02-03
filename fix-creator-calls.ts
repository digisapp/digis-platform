import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const sql = postgres(process.env.DATABASE_URL || '');

  console.log('Ensuring all creators have call settings with calls ON...\n');

  // 1. Find all creators without settings and create settings for them
  const creatorsWithoutSettings = await sql`
    SELECT u.id, u.username
    FROM users u
    LEFT JOIN creator_settings cs ON cs.user_id = u.id
    WHERE u.role = 'creator' AND cs.id IS NULL
  `;

  console.log(`Found ${creatorsWithoutSettings.length} creators without settings`);

  for (const creator of creatorsWithoutSettings) {
    await sql`
      INSERT INTO creator_settings (user_id, call_rate_per_minute, minimum_call_duration, voice_call_rate_per_minute, minimum_voice_call_duration, message_rate, is_available_for_calls, is_available_for_voice_calls)
      VALUES (${creator.id}, 25, 5, 15, 5, 3, true, true)
    `;
    console.log(`✅ Created settings for @${creator.username}`);
  }

  // 2. Update any existing settings that have calls OFF to ON
  const result = await sql`
    UPDATE creator_settings
    SET is_available_for_calls = true, is_available_for_voice_calls = true, updated_at = NOW()
    WHERE is_available_for_calls = false OR is_available_for_voice_calls = false
    RETURNING user_id
  `;

  console.log(`\n🔄 Updated ${result.length} creators to have calls ON`);

  // 3. Show summary
  const summary = await sql`
    SELECT
      COUNT(*) FILTER (WHERE is_available_for_calls = true AND is_available_for_voice_calls = true) as both_on,
      COUNT(*) FILTER (WHERE is_available_for_calls = false OR is_available_for_voice_calls = false) as some_off,
      COUNT(*) as total
    FROM creator_settings
  `;

  console.log('\n--- Final State ---');
  console.log(`Total creator settings: ${summary[0].total}`);
  console.log(`Both calls ON: ${summary[0].both_on}`);
  console.log(`Some calls OFF: ${summary[0].some_off}`);

  await sql.end();
  console.log('\nDone!');
}

main().catch(console.error);
