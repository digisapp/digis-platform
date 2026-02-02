import { NextResponse } from 'next/server';
import { AuthzError, requireAdminOrThrow } from './admin';
import { assertValidOrigin } from '@/lib/security/origin-check';
import type { User } from '@supabase/supabase-js';

interface AdminContext {
  user: User;
  appMeta: Record<string, unknown>;
  request: Request;
}

/**
 * Standard error response shape for admin routes
 * Frontend can always depend on: { error: string, code?: string }
 */
interface ErrorResponse {
  error: string;
  code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INTERNAL_ERROR';
}

function jsonError(error: string, code: ErrorResponse['code'], status: number): NextResponse<ErrorResponse> {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Higher-order function wrapper for admin-only API routes
 *
 * Handles auth checks and error responses consistently.
 * Use this to wrap any route handler that requires admin access.
 *
 * @example
 * // src/app/api/admin/something/route.ts
 * import { withAdmin } from '@/lib/auth/withAdmin';
 *
 * export const GET = withAdmin(async ({ user, request }) => {
 *   // Your admin-only logic here - no need for auth checks
 *   return NextResponse.json({ data: 'admin only' });
 * });
 *
 * export const POST = withAdmin(async ({ user, request }) => {
 *   const body = await request.json();
 *   // Process admin action
 *   return NextResponse.json({ success: true });
 * });
 */
export function withAdmin<T extends Response | NextResponse>(
  handler: (ctx: AdminContext) => Promise<T>
) {
  return async (request: Request): Promise<Response | NextResponse> => {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    // CSRF mitigation: Validate Origin/Referer for all admin mutations
    const originCheck = assertValidOrigin(request, { requireHeader: true });
    if (!originCheck.ok) {
      console.warn(
        `[withAdmin] ${method} ${path} - Invalid origin (${originCheck.reason})` +
        (originCheck.candidateOrigin ? ` from ${originCheck.candidateOrigin}` : '')
      );
      return jsonError('Invalid origin', 'FORBIDDEN', 403);
    }

    try {
      const { user, appMeta } = await requireAdminOrThrow();
      return await handler({ user, appMeta, request });
    } catch (err: unknown) {
      if (err instanceof AuthzError) {
        // Log auth failures with context
        console.warn(`[withAdmin] ${method} ${path} - ${err.message} (${err.status})`);

        if (err.status === 401) {
          return jsonError(err.message, 'UNAUTHORIZED', 401);
        }
        return jsonError(err.message, 'FORBIDDEN', 403);
      }

      // Log unexpected errors with full context
      console.error(`[withAdmin] ${method} ${path} - Unhandled error:`, err);
      return jsonError('Internal Server Error', 'INTERNAL_ERROR', 500);
    }
  };
}

/**
 * Variant that also passes through URL params for dynamic routes
 *
 * @example
 * // src/app/api/admin/users/[userId]/route.ts
 * import { withAdminParams } from '@/lib/auth/withAdmin';
 *
 * export const GET = withAdminParams<{ userId: string }>(async ({ user, params }) => {
 *   const { userId } = await params;
 *   return NextResponse.json({ userId });
 * });
 *
 * export const POST = withAdminParams<{ userId: string }>(async ({ user, params, request }) => {
 *   const { userId } = await params;
 *   const body = await request.json();
 *   return NextResponse.json({ userId, updated: true });
 * });
 */
export function withAdminParams<P = Record<string, string>, T extends Response | NextResponse = NextResponse>(
  handler: (ctx: AdminContext & { params: Promise<P> }) => Promise<T>
) {
  return async (
    request: Request,
    { params }: { params: Promise<P> }
  ): Promise<Response | NextResponse> => {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;

    // CSRF mitigation: Validate Origin/Referer for all admin mutations
    const originCheck = assertValidOrigin(request, { requireHeader: true });
    if (!originCheck.ok) {
      console.warn(
        `[withAdminParams] ${method} ${path} - Invalid origin (${originCheck.reason})` +
        (originCheck.candidateOrigin ? ` from ${originCheck.candidateOrigin}` : '')
      );
      return jsonError('Invalid origin', 'FORBIDDEN', 403);
    }

    try {
      const { user, appMeta } = await requireAdminOrThrow();
      return await handler({ user, appMeta, request, params });
    } catch (err: unknown) {
      if (err instanceof AuthzError) {
        console.warn(`[withAdminParams] ${method} ${path} - ${err.message} (${err.status})`);

        if (err.status === 401) {
          return jsonError(err.message, 'UNAUTHORIZED', 401);
        }
        return jsonError(err.message, 'FORBIDDEN', 403);
      }

      console.error(`[withAdminParams] ${method} ${path} - Unhandled error:`, err);
      return jsonError('Internal Server Error', 'INTERNAL_ERROR', 500);
    }
  };
}
