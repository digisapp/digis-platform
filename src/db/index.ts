import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Type for the database instance with schema
type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

// Global cache to avoid creating multiple connections
declare global {
  // eslint-disable-next-line no-var
  var __db: DbInstance | undefined;
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

/**
 * Get database instance with lazy initialization.
 * This avoids capturing stale env vars during build time on Vercel.
 */
export function getDb(): DbInstance {
  if (!global.__db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('DATABASE_URL is not set at runtime!');
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log('[DB] Initializing connection with runtime DATABASE_URL');

    // Disable prefetch as it is not supported for "Transaction" pool mode
    // Add connection pooling settings optimized for serverless
    global.__dbClient = postgres(connectionString, {
      prepare: false,
      max: 1,  // Limit connections for serverless
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: 'require'  // Explicitly require SSL
    });
    global.__db = drizzle(global.__dbClient, { schema });
  }

  return global.__db;
}

// Export db for backward compatibility, but it will initialize on first use
export const db = getDb();
