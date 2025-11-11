import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use Drizzle ORM to query users table
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    // If user not found in database, return auth data as fallback
    if (!dbUser) {
      console.error('User not found in database - using auth data fallback');
      const isAdminEmail = user.email === 'admin@digis.cc' || user.email === 'nathan@digis.cc';

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email!,
          username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
          displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
          role: user.user_metadata?.role || (isAdminEmail ? 'admin' : 'fan'),
          avatarUrl: null,
          bannerUrl: null,
          bio: null,
          isCreatorVerified: false,
        }
      });
    }

    // Return database user with snake_case converted to camelCase
    const response = NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        bannerUrl: dbUser.bannerUrl,
        bio: dbUser.bio,
        role: dbUser.role,
        isCreatorVerified: dbUser.isCreatorVerified,
        followerCount: dbUser.followerCount,
        followingCount: dbUser.followingCount,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      }
    });

    // Add no-cache headers to prevent browser caching of user role/profile
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
