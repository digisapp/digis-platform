import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin Authorization Utilities
 *
 * SINGLE SOURCE OF TRUTH: app_metadata.isAdmin === true
 *
 * The isAdmin flag is stored in the database (users.is_admin) and synced
 * to Supabase app_metadata when updated via AdminService.setAdminStatus().
 *
 * DO NOT check role === 'admin' anywhere - that creates a second source of truth.
 * Use these utilities everywhere instead of inline checks.
 */

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = 'AuthzError';
    this.status = status;
  }
}

/**
 * THE SINGLE ADMIN PREDICATE
 *
 * Only checks app_metadata.isAdmin === true
 * This is the ONLY place admin status should be determined from JWT claims.
 */
export function isAdminFromClaims(appMeta: Record<string, unknown> | null | undefined): boolean {
  return appMeta?.isAdmin === true;
}

/**
 * Get the current authenticated user from Supabase
 * Used internally by requireAdmin* functions
 */
async function getServerUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, appMeta: null };
  }

  return {
    user,
    appMeta: (user.app_metadata ?? {}) as Record<string, unknown>
  };
}

/**
 * Use in Server Components and Server Actions
 * Redirects to specified path if user is not admin
 *
 * @example
 * // In a Server Component or Server Action
 * export default async function AdminPage() {
 *   const { user } = await requireAdminOrRedirect();
 *   // ... admin-only content
 * }
 */
export async function requireAdminOrRedirect(opts?: {
  redirectTo?: string;
  notAuthenticatedRedirect?: string;
}) {
  const { redirectTo = '/', notAuthenticatedRedirect = '/login' } = opts ?? {};

  const { user, appMeta } = await getServerUser();

  if (!user) {
    redirect(notAuthenticatedRedirect);
  }

  if (!isAdminFromClaims(appMeta)) {
    redirect(redirectTo);
  }

  return { user, appMeta };
}

/**
 * Use in Route Handlers (API routes)
 * Throws AuthzError if user is not admin
 *
 * @example
 * // In an API route
 * export async function GET() {
 *   const { user } = await requireAdminOrThrow();
 *   // ... admin-only logic
 * }
 */
export async function requireAdminOrThrow() {
  const { user, appMeta } = await getServerUser();

  if (!user) {
    throw new AuthzError('Unauthorized', 401);
  }

  if (!isAdminFromClaims(appMeta)) {
    throw new AuthzError('Forbidden - Admin access required', 403);
  }

  return { user, appMeta };
}

/**
 * Check admin status without throwing/redirecting
 * Useful for conditional logic
 *
 * @example
 * const { isAdmin, user } = await checkAdminStatus();
 * if (isAdmin) { ... }
 */
export async function checkAdminStatus() {
  const { user, appMeta } = await getServerUser();

  return {
    user,
    appMeta,
    isAuthenticated: !!user,
    isAdmin: isAdminFromClaims(appMeta),
  };
}
