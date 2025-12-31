import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function check() {
  const username = 'ayannaverrelli';

  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
  });

  if (!user) {
    console.log('User not found:', username);
    await sql.end();
    return;
  }

  console.log('═'.repeat(50));
  console.log('User:', user.username);
  console.log('ID:', user.id);
  console.log('Role:', user.role);
  console.log('═'.repeat(50));

  const settings = await db.query.creatorSettings.findFirst({
    where: eq(schema.creatorSettings.userId, user.id),
  });

  if (settings) {
    console.log('\nCreator Settings:');
    console.log('  messageRate:', settings.messageRate);
    console.log('  callRatePerMinute:', settings.callRatePerMinute);
    console.log('  voiceCallRatePerMinute:', settings.voiceCallRatePerMinute);
  } else {
    console.log('\n❌ NO creator_settings record found!');
  }

  await sql.end();
}

check().catch(console.error);
