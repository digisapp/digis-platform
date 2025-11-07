/**
 * System-level data access using Drizzle ORM
 *
 * Use this for:
 * - Complex queries with joins and aggregations
 * - Analytics and reporting
 * - Admin operations
 * - Financial transactions
 * - System/background jobs
 *
 * IMPORTANT: Routes using this MUST export:
 *   export const runtime = 'nodejs';
 *   export const dynamic = 'force-dynamic';
 */

export { db } from '@/db';
export * from '@/db/schema';
