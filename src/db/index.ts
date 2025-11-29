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
    // Try DATABASE_URL first (pooled connection), fallback to DIRECT_DATABASE_URL
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

    if (!connectionString) {
      console.error('[DB ERROR] Neither DATABASE_URL nor DIRECT_DATABASE_URL is set at runtime!');
      throw new Error('DATABASE_URL or DIRECT_DATABASE_URL environment variable is required');
    }

    console.log('[DB] Initializing Drizzle connection with Supabase pooler');

    // Singleton connection pool optimized for Vercel serverless at scale
    // CRITICAL: prepare: false required for PgBouncer/pooler compatibility
    global.__dbClient = postgres(connectionString, {
      prepare: false,        // REQUIRED for PgBouncer/transaction pooler
      ssl: 'require',        // Required for Supabase
      max: 100,              // Allow 100 connections per serverless instance (for 200k users)
      idle_timeout: 20,     // Close idle connections after 20s (faster recycling)
      connect_timeout: 10,  // 10s connection timeout (fail fast)
      max_lifetime: 60 * 15, // 15 minutes max connection lifetime (faster recycling)
      fetch_types: false,   // Disable type fetching for faster cold starts
      connection: {
        application_name: 'digis-app', // Helps identify connections in pg_stat_activity
      },
      onnotice: () => {},   // Suppress notice messages
    });
    global.__db = drizzle(global.__dbClient, { schema });

    console.log('[DB] Connection pool initialized successfully');
  }

  return global.__db;
}

// Export singleton db instance
// IMPORTANT: Only use in Node.js runtime (not Edge or browser)
export const db = getDb();
