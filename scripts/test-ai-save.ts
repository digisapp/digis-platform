/**
 * Test AI Twin settings save for a creator
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

async function testSave() {
  const username = 'ayannaverrelli';
  
  console.log('═'.repeat(50));
  console.log(`Testing AI Twin save for @${username}`);
  console.log('═'.repeat(50));
  
  // Get user
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username),
  });
  
  if (!user) {
    console.log('❌ User not found');
    await sql.end();
    return;
  }
  
  console.log('\n📋 BEFORE:');
  const before = await db.query.aiTwinSettings.findFirst({
    where: eq(schema.aiTwinSettings.creatorId, user.id),
  });
  console.log('  Voice Enabled:', before?.enabled);
  console.log('  Text Enabled:', before?.textChatEnabled);
  
  // Try to enable voice
  console.log('\n🔧 UPDATING: Setting enabled=true...');
  
  try {
    const result = await db.update(schema.aiTwinSettings)
      .set({ 
        enabled: true,
        updatedAt: new Date()
      })
      .where(eq(schema.aiTwinSettings.creatorId, user.id))
      .returning();
    
    console.log('  ✅ Update successful!');
    console.log('  Result:', result[0]?.enabled);
  } catch (err: any) {
    console.log('  ❌ Update failed:', err.message);
  }
  
  console.log('\n📋 AFTER:');
  const after = await db.query.aiTwinSettings.findFirst({
    where: eq(schema.aiTwinSettings.creatorId, user.id),
  });
  console.log('  Voice Enabled:', after?.enabled);
  console.log('  Text Enabled:', after?.textChatEnabled);
  
  await sql.end();
}

testSave().catch(console.error);
