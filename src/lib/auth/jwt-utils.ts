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
 * This is a last-resort fallback when auth.getSession() is null.
 *
 * @returns Role or null if not found
 */
export function getRoleFromLocalStorage(): Role | null {
  if (typeof window === 'undefined') return null;

  try {
    // Supabase stores auth token in localStorage with pattern: sb-*-auth-token
    const keys = Object.keys(localStorage);
    const authTokenKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));

    if (!authTokenKey) {
      console.log('[JWT] No Supabase auth token found in localStorage');
      return null;
    }

    const authData = localStorage.getItem(authTokenKey);
    if (!authData) return null;

    const parsed = JSON.parse(authData);
    const accessToken = parsed?.access_token || parsed?.accessToken;

    if (!accessToken) {
      console.log('[JWT] No access token in localStorage auth data');
      return null;
    }

    const role = getRoleFromToken(accessToken);
    if (role) {
      console.log('[JWT] Extracted role from localStorage token:', role);
    }

    return role;
  } catch (err) {
    console.warn('[JWT] Failed to extract role from localStorage:', err);
    return null;
  }
}

/**
 * Get role from multiple sources with priority:
 * 1. Supabase session (most reliable)
 * 2. localStorage auth token (fallback)
 * 3. localStorage digis_user_role (last resort)
 *
 * @param supabaseRole - Role from supabase.auth.getSession()
 * @returns Role or null
 */
export function getRoleWithFallback(supabaseRole: Role | null): Role | null {
  // Priority 1: Supabase session
  if (supabaseRole) return supabaseRole;

  // Priority 2: Decode from localStorage auth token
  const tokenRole = getRoleFromLocalStorage();
  if (tokenRole) return tokenRole;

  // Priority 3: localStorage digis_user_role (previously cached)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('digis_user_role');
    if (stored && isValidRole(stored)) {
      console.log('[JWT] Using cached role from localStorage:', stored);
      return stored;
    }
  }

  return null;
}
