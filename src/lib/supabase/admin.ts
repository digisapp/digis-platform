/**
 * Supabase Admin Client
 *
 * ⚠️ SERVER-ONLY: Uses service role key with elevated privileges.
 * NEVER import this file in client-side code.
 *
 * Used for:
 * - Updating user auth metadata (app_metadata, user_metadata)
 * - Admin operations that require bypassing RLS
 * - User management operations
 */

import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'This must be set server-side only (never in browser).'
  );
}

/**
 * Admin client with service role permissions.
 * Use sparingly and only in server-side code.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
