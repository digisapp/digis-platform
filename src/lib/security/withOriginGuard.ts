/**
 * Higher-Order Function to wrap route handlers with Origin/Referer validation
 *
 * Use this for non-admin high-risk mutation routes like:
 * - POST /api/wallet/banking-info
 * - POST /api/wallet/payouts/request
 * - POST /api/user/update-username
 */

import { NextResponse } from 'next/server';
import { assertValidOrigin } from './origin-check';

/**
 * Wraps a route handler with Origin/Referer validation.
 *
 * @example
 * export const POST = withOriginGuard(async (request) => {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * });
 */
export function withOriginGuard<T extends Response | NextResponse>(
  handler: (request: Request) => Promise<T>,
  opts?: { requireHeader?: boolean }
) {
  return async (request: Request): Promise<Response | NextResponse> => {
    const result = assertValidOrigin(request, { requireHeader: opts?.requireHeader ?? true });

    if (!result.ok) {
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname;

      console.warn(
        `[withOriginGuard] ${method} ${path} - Blocked: ${result.reason}` +
        (result.candidateOrigin ? ` (origin: ${result.candidateOrigin})` : '')
      );

      return NextResponse.json(
        {
          error: 'Invalid origin',
          code: 'INVALID_ORIGIN',
        },
        { status: 403 }
      );
    }

    return handler(request);
  };
}
