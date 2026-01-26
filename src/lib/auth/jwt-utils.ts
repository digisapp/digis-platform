/**
 * JWT Utilities
 *
 * Low-level utilities for extracting data from Supabase JWT tokens.
 * Used as a last-resort fallback when auth.getSession() fails.
 */

import { type Role, isValidRole } from '@/types/auth';

/**
 * Decode a JWT token without verification.
 * WARNING: Only use for reading claims, never for authentication!
 *
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (err) {
    console.warn('[JWT] Failed to decode token:', err);
    return null;
  }
}

/**
 * Extract role from Supabase JWT token.
 * Checks both app_metadata.role and user_metadata.role.
 *
 * @param token - JWT token string
 * @returns Role or null if not found/invalid
 */
export function getRoleFromToken(token: string): Role | null {
  const payload = decodeJWT(token);
  if (!payload) return null;

  const role =
    payload.app_metadata?.role ??
    payload.user_metadata?.role ??
    null;

  return isValidRole(role) ? role : null;
}

/**
 * Extract role from localStorage Supabase auth token.
 *
 * SECURITY WARNING: This function decodes JWT WITHOUT verification.
 * Only use for UI hints (showing/hiding elements), NEVER for authorization.
 * Server-side checks must always verify the actual session.
 *
 * @returns Role or null if not found
 * @deprecated Use getRoleFromLocalStorageForUI instead to make intent clear
 */
export function getRoleFromLocalStorage(): Role | null {
  return getRoleFromLocalStorageForUI();
}

/**
 * Extract role from localStorage for UI display purposes ONLY.
 *
 * SECURITY: This is UNVERIFIED data from localStorage. An attacker with XSS
 * could modify this. Only use for UI hints like showing/hiding menu items.
 * All actual authorization must happen server-side.
 *
 * @returns Role or null if not found
 */
export function getRoleFromLocalStorageForUI(): Role | null {
  if (typeof window === 'undefined') return null;

  try {
    // Supabase stores auth token in localStorage with pattern: sb-*-auth-token
    const keys = Object.keys(localStorage);
    const authTokenKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));

    if (!authTokenKey) {
      return null;
    }

    const authData = localStorage.getItem(authTokenKey);
    if (!authData) return null;

    const parsed = JSON.parse(authData);
    const accessToken = parsed?.access_token || parsed?.accessToken;

    if (!accessToken) {
      return null;
    }

    // SECURITY: This only decodes, does NOT verify signature
    // Never use this for actual authorization decisions
    return getRoleFromToken(accessToken);
  } catch (err) {
    console.warn('[JWT] Failed to extract role from localStorage:', err);
    return null;
  }
}

/**
 * Get role from multiple sources with priority:
 * 1. Supabase session (most reliable, server-verified)
 * 2. localStorage auth token (fallback for UI only)
 *
 * SECURITY: Only the Supabase session role is verified. Fallback roles
 * from localStorage are UNVERIFIED and should only be used for UI hints.
 * All authorization must happen server-side with proper session verification.
 *
 * @param supabaseRole - Role from supabase.auth.getSession()
 * @returns Role or null
 */
export function getRoleWithFallback(supabaseRole: Role | null): Role | null {
  // Priority 1: Supabase session (VERIFIED - safe for authorization)
  if (supabaseRole) return supabaseRole;

  // Priority 2: Decode from localStorage auth token (UNVERIFIED - UI hints only)
  // SECURITY: Do NOT use this role for actual authorization decisions
  const tokenRole = getRoleFromLocalStorageForUI();
  if (tokenRole) return tokenRole;

  // REMOVED: localStorage digis_user_role fallback
  // This was too easy to tamper with and shouldn't be trusted for any purpose

  return null;
}
