import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Type for the database instance with schema
type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

// Global cache to avoid creating multiple connections (singleton pool)
declare global {
  // eslint-disable-next-line no-var
  var __db: DbInstance | undefined;
  // eslint-disable-next-line no-var
  var __dbClient: ReturnType<typeof postgres> | undefined;
}

/**
 * Get database instance with lazy initialization and singleton pooling.
 * This avoids capturing stale env vars during build time on Vercel
 * and prevents connection churn in serverless environments.
 *
 * IMPORTANT: Must be used with Node.js runtime only.
 * Add to your route: export const runtime = 'nodejs';
 */
export function getDb(): DbInstance {
  if (!global.__db) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('[DB ERROR] DATABASE_URL is not set at runtime!');
      throw new Error('DATABASE_URL environment variable is required');
    }

    console.log('[DB] Initializing singleton Drizzle connection with Supabase pooler');

    // Singleton connection pool optimized for Vercel serverless
    // Using Supabase Transaction Pooler (port 6543) for connection pooling
    // CRITICAL: prepare: false required for PgBouncer/pooler compatibility
    global.__dbClient = postgres(connectionString, {
      prepare: false,        // REQUIRED for PgBouncer/transaction pooler
      ssl: 'require',        // Required for Supabase
      max: 10,              // Keep small for serverless
      idle_timeout: 30,     // Close idle connections after 30s
      connect_timeout: 30,  // 30s connection timeout
    });
    global.__db = drizzle(global.__dbClient, { schema });

    console.log('[DB] Connection pool initialized successfully');
  }

  return global.__db;
}

// Export singleton db instance
// IMPORTANT: Only use in Node.js runtime (not Edge or browser)
export const db = getDb();
