import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper for timeout
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
  ]);

/**
 * Build fallback user from Supabase auth metadata
 * This ensures we NEVER return 500 for a valid logged-in session
 */
function buildFallbackUser(authUser: any) {
  const metadata = authUser.user_metadata || {};

  // Determine role: prefer metadata, then check admin emails, fallback to creator
  const role =
    metadata.role ||
    (authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc'
      ? 'admin'
      : 'creator'); // Default to creator for Digis creators

  return {
    id: authUser.id,
    email: authUser.email!,
    username: metadata.username || `user_${authUser.id.substring(0, 8)}`,
    displayName: metadata.display_name || authUser.email?.split('@')[0],
    role,
    avatarUrl: metadata.avatar_url || null,
    bannerUrl: null,
    bio: null,
    isCreatorVerified: !!metadata.isCreatorVerified,
    isOnline: false,
    lastSeenAt: null,
    usernameLastChangedAt: null,
    followerCount: 0,
    followingCount: 0,
    createdAt: authUser.created_at,
    updatedAt: authUser.created_at,
    profile: null,
  };
}

export async function GET() {
  try {
    // 1) Get auth user from Supabase
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('[USER_ME] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2) Try to fetch user from database with timeout (3s max)
    let user = null;

    try {
      user = await withTimeout(
        db.query.users.findFirst({
          where: eq(users.id, authUser.id),
          with: {
            profile: true,
          },
        }),
        3000
      );
    } catch (relationError) {
      // If profile relation fails, try without it
      console.warn('[USER_ME] Profile relation failed, retrying without profile');

      try {
        user = await withTimeout(
          db.query.users.findFirst({
            where: eq(users.id, authUser.id),
          }),
          2000
        );
      } catch (dbError) {
        console.error('[USER_ME] Database query failed');
        // Fall through to fallback below
      }
    }

    // 3) If DB user not found or DB failed, return fallback from auth metadata
    if (!user) {
      console.warn('[USER_ME] User not found in database - using auth metadata fallback');

      const fallbackUser = buildFallbackUser(authUser);

      const response = NextResponse.json(fallbackUser);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;
    }

    console.log('[USER_ME] User found in DB:', {
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // 4) Normal success path: return DB user
    const response = NextResponse.json(user);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    // 5) FINAL safety net: if something *still* blows up,
    // try to recover auth user and build a fallback, instead of 500
    console.error('[USER_ME] Unhandled error in GET:', error);

    try {
      const supabase = await createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        console.warn('[USER_ME] Using ultimate fallback from auth metadata after unhandled error');

        const fallbackUser = buildFallbackUser(authUser);

        const response = NextResponse.json(fallbackUser);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        return response;
      }
    } catch (fallbackError) {
      console.error('[USER_ME] Fallback-from-auth failed:', fallbackError);
    }

    // If we *really* can't get anything, only then return 500
    return NextResponse.json(
      {
        error: 'An error occurred while fetching user data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
