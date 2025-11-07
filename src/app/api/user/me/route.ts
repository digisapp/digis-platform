import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    // Try to get user from database with fallback
    let user;
    try {
      user = await db.query.users.findFirst({
        where: eq(users.id, authUser.id),
      });
    } catch (dbError) {
      console.error('Database error - using auth data fallback:', dbError);
      // Return minimal user data from Supabase auth if database fails
      // Check if this is admin email
      const isAdminEmail = authUser.email === 'admin@digis.cc' || authUser.email === 'nathan@digis.cc';
      user = {
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
      };
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}
