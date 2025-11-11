import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use Drizzle ORM to query users table
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    // If user not found in database, return auth data as fallback
    if (!user) {
      console.error('User not found in database - using auth data fallback');
      const isAdminEmail = authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc';

      return NextResponse.json({
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
      });
    }

    const response = NextResponse.json(user);

    // Add no-cache headers to prevent browser caching of user role/profile
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}
