import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { loginSchema, validateBody } from '@/lib/validation/schemas';
import * as Sentry from '@sentry/nextjs';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit login attempts (5/min per IP)
    const rl = await rateLimit(request, 'auth:login');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again in a minute.' },
        { status: 429, headers: rl.headers }
      );
    }

    // Validate input
    const validation = await validateBody(request, loginSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const supabase = await createClient();

    // 1) Supabase sign in - this is the source of truth for auth
    console.log('[LOGIN] Attempting sign in for:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[LOGIN] Supabase auth error:', error.message, error.status);

      // Provide user-friendly error messages
      let userMessage = error.message;
      if (error.message.includes('Invalid login credentials')) {
        userMessage = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        userMessage = 'Please verify your email before logging in';
      } else if (error.message.includes('rate limit')) {
        userMessage = 'Too many attempts. Please try again later.';
      }

      return NextResponse.json(
        { error: userMessage },
        { status: 401 }
      );
    }

    const authUser = data.user;
    const metadata = authUser.user_metadata || {};

    // 2) Try to fetch DB user with short timeout (don't block login)
    let dbUser: any = null;

    try {
      const dbQueryPromise = db.query.users.findFirst({
        where: eq(users.id, authUser.id),
        columns: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          isAdmin: true,
          isCreatorVerified: true,
          avatarUrl: true,
        },
      });

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 3000)
      );

      dbUser = await Promise.race([dbQueryPromise, timeoutPromise]);
    } catch (queryError) {
      console.warn('[LOGIN] DB lookup failed or timed out, using auth metadata only', queryError);
      // Don't fail login - just use metadata
    }

    // 3) Admin status is determined ONLY by the database isAdmin flag
    // SECURITY: Removed hardcoded admin emails - admin status must be set via database
    // To make someone admin: UPDATE users SET is_admin = true WHERE email = 'user@example.com';
    // Or use the admin dashboard to promote users

    // Priority: DB role > metadata role > fan (default)
    // Note: role is separate from isAdmin - a creator can also be an admin
    const role = dbUser?.role || metadata.role || 'fan';

    const username = dbUser?.username || metadata.username || authUser.email?.split('@')[0];

    // Build response user object
    // isAdmin is ONLY determined by database flag - no email-based admin promotion
    const responseUser = {
      id: authUser.id,
      email: authUser.email,
      username,
      displayName: dbUser?.displayName || metadata.display_name || username,
      role,
      isAdmin: dbUser?.isAdmin || false, // Only trust database flag
      isCreatorVerified: dbUser?.isCreatorVerified ?? !!metadata.isCreatorVerified,
      avatarUrl: dbUser?.avatarUrl || metadata.avatar_url || null,
    };

    // Update user_metadata with role if we found it in DB (fire-and-forget for future fast lookups)
    if (dbUser?.role && dbUser.role !== metadata.role) {
      supabase.auth.updateUser({ data: { role: dbUser.role } })
        .catch((e) => console.warn('[LOGIN] Failed to sync role to metadata', e));
    }

    // Update last_seen_at on login (fire-and-forget)
    void (async () => {
      try {
        await supabase
          .from('users')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', authUser.id);
      } catch (e) {
        console.warn('[LOGIN] Failed to update last_seen_at', e);
      }
    })();

    return NextResponse.json({
      user: responseUser,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    Sentry.captureException(error, {
      tags: { service: 'auth', route: 'POST /api/auth/login' },
    });
    return NextResponse.json(
      {
        error: 'An error occurred during login',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
