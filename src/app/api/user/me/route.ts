import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

    // Use Supabase admin client to query users table
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error: dbError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    // If user not found in database, return auth data as fallback
    if (dbError || !user) {
      console.error('Database error - using auth data fallback:', dbError);
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}
