import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, profiles } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('[USER_ME] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[USER_ME] Fetching user:', authUser.id);

    // Use Drizzle ORM to query users table
    // Try to fetch with profile, but handle gracefully if relation fails
    let user;
    try {
      user = await db.query.users.findFirst({
        where: eq(users.id, authUser.id),
        with: {
          profile: true,
        },
      });
    } catch (relationError) {
      // If relation fails (migration not run yet), fetch without profile
      console.warn('[USER_ME] Profile relation failed, fetching without profile:', relationError);
      try {
        user = await db.query.users.findFirst({
          where: eq(users.id, authUser.id),
        });
      } catch (dbError) {
        console.error('[USER_ME] Database query failed completely:', dbError);
        // Fall through to auth fallback below
      }
    }

    // If user not found in database, return auth data as fallback
    if (!user) {
      console.warn('[USER_ME] User not found in database - using auth data fallback');
      const isAdminEmail = authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc';

      const fallbackUser = {
        id: authUser.id,
        email: authUser.email!,
        username: authUser.user_metadata?.username || `user_${authUser.id.substring(0, 8)}`,
        displayName: authUser.user_metadata?.display_name || authUser.email?.split('@')[0],
        role: authUser.user_metadata?.role || (isAdminEmail ? 'admin' : 'fan'),
        avatarUrl: null,
        bannerUrl: null,
        bio: null,
        isCreatorVerified: false,
        isOnline: false,
        lastSeenAt: null,
        usernameLastChangedAt: null,
        followerCount: 0,
        followingCount: 0,
        createdAt: authUser.created_at,
        updatedAt: authUser.created_at,
        profile: null,
      };

      const response = NextResponse.json(fallbackUser);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
      return response;
    }

    console.log('[USER_ME] User found:', { id: user.id, username: user.username, role: user.role });

    const response = NextResponse.json(user);

    // Add no-cache headers to prevent browser caching of user role/profile
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('[USER_ME] Unhandled error:', error);
    // Return a fallback response instead of 500 to prevent auth breaking
    return NextResponse.json(
      {
        error: 'An error occurred while fetching user data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
