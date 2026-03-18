import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import type { User } from '@supabase/supabase-js';

type AuthedContext = {
  user: User;
  request: NextRequest;
};

type PublicContext = {
  user: User | null;
  request: NextRequest;
};

type HandlerOptions = {
  /** Rate limit bucket name (e.g. 'wallet:balance'). Skipped if omitted. */
  rateLimit?: string;
  /** Require role (checked from app_metadata first, then user_metadata) */
  role?: 'creator' | 'admin';
};

/**
 * Wraps an authenticated API route handler with:
 * - Supabase auth check (401 if not logged in)
 * - Optional rate limiting
 * - Optional role check (403 if wrong role)
 * - try/catch with standardized error logging
 *
 * Usage:
 *   export const GET = authed(async ({ user, request }) => {
 *     return NextResponse.json({ id: user.id });
 *   }, { rateLimit: 'user:profile', role: 'creator' });
 */
export function authed(
  handler: (_ctx: AuthedContext) => Promise<NextResponse>,
  options?: HandlerOptions,
) {
  return async (request: NextRequest) => {
    try {
      // Rate limit (by IP, before auth to protect against brute force)
      if (options?.rateLimit) {
        const rl = await rateLimit(request, options.rateLimit);
        if (!rl.ok) {
          return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: rl.headers },
          );
        }
      }

      // Auth
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Role check
      if (options?.role) {
        const role = user.app_metadata?.role || user.user_metadata?.role;
        if (options.role === 'admin') {
          // Admin requires database check — caller should verify in handler
          // This is a fast-fail for obvious non-admins
          if (role !== 'admin' && !user.app_metadata?.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        } else if (role !== options.role) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      return await handler({ user, request });
    } catch (error: any) {
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}`, error?.message || error);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}

/**
 * Wraps a public API route handler (no auth required, but user is resolved if available).
 * Still provides try/catch and optional rate limiting.
 *
 * Usage:
 *   export const GET = public_(async ({ user, request }) => {
 *     // user may be null
 *     return NextResponse.json({ data });
 *   });
 */
export function public_(
  handler: (_ctx: PublicContext) => Promise<NextResponse>,
  options?: Pick<HandlerOptions, 'rateLimit'>,
) {
  return async (request: NextRequest) => {
    try {
      if (options?.rateLimit) {
        const rl = await rateLimit(request, options.rateLimit);
        if (!rl.ok) {
          return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: rl.headers },
          );
        }
      }

      let user: User | null = null;
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        user = data.user;
      } catch {
        // Auth optional — continue without user
      }

      return await handler({ user, request });
    } catch (error: any) {
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}`, error?.message || error);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
  };
}
