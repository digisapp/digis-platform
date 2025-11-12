/**
 * Session Refresh Utility
 *
 * Provides utilities to manually refresh Supabase auth sessions.
 * Useful when user roles change and need immediate JWT updates.
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Manually refresh the current user's session to get updated JWT tokens.
 * Call this after an admin changes a user's role or verification status.
 *
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function refreshSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('[RefreshSession] Failed to refresh session:', error);
      return { success: false, error: error.message };
    }

    if (!data.session) {
      console.warn('[RefreshSession] No session found');
      return { success: false, error: 'No active session' };
    }

    console.log('[RefreshSession] Session refreshed successfully');
    return { success: true };
  } catch (err: any) {
    console.error('[RefreshSession] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get the current role from the JWT token without making an API call.
 * Useful for checking if a refresh is needed.
 *
 * @returns Promise<string | null> - The role from JWT app_metadata, or null if not found
 */
export async function getRoleFromJWT(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return null;
    }

    // Check app_metadata first (authoritative), then user_metadata (fallback)
    const role = (session.user.app_metadata as any)?.role ??
                 (session.user.user_metadata as any)?.role ??
                 null;

    return role;
  } catch (err) {
    console.error('[GetRoleFromJWT] Error:', err);
    return null;
  }
}

/**
 * Force refresh the session and return the updated role.
 * Combines refreshSession + getRoleFromJWT for convenience.
 *
 * @returns Promise<{ role: string | null; error?: string }>
 */
export async function refreshAndGetRole(): Promise<{ role: string | null; error?: string }> {
  const { success, error } = await refreshSession();

  if (!success) {
    return { role: null, error };
  }

  const role = await getRoleFromJWT();
  return { role };
}
