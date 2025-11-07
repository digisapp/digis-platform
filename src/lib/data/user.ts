/**
 * User-scoped data access using Supabase JS with RLS
 *
 * Use this for:
 * - User-owned CRUD operations
 * - Chat messages and notifications
 * - Following/unfollowing
 * - Likes, bookmarks, user preferences
 * - Any operation that should be enforced by Row Level Security
 *
 * RLS policies will automatically enforce permissions based on the user's JWT.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Create a Supabase client with the user's session (RLS-enabled)
 * This respects Row Level Security policies in the database.
 */
export async function userClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
