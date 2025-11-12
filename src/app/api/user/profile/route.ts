import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';

// Force Node.js runtime and disable all caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 👉 Prefer role from JWT app_metadata (source of truth)
    const jwtRole =
      (user.app_metadata as any)?.role ??
      (user.user_metadata as any)?.role ??
      null;

    // Use Drizzle ORM to query users table with timeout and retry
    let dbUser;
    try {
      dbUser = await withTimeoutAndRetry(
        () => db.query.users.findFirst({
          where: eq(users.id, user.id),
        }),
        {
          timeoutMs: 3000,
          retries: 2,
          tag: 'getUserProfile'
        }
      );
    } catch (dbError) {
      console.error('Database timeout fetching user profile - using auth fallback:', dbError);
      // Continue to fallback logic below
    }

    // Build merged user object (JWT role is authoritative, DB enriches)
    const merged = {
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || dbUser?.username || `user_${user.id.substring(0, 8)}`,
      displayName: user.user_metadata?.display_name || dbUser?.displayName || user.email?.split('@')[0],
      role: jwtRole, // 👈 Never override this with a fallback "fan"
      avatarUrl: user.user_metadata?.avatar_url || dbUser?.avatarUrl || null,
      bannerUrl: dbUser?.bannerUrl || null,
      bio: dbUser?.bio || null,
      isCreatorVerified: user.user_metadata?.is_creator_verified ?? dbUser?.isCreatorVerified ?? false,
      followerCount: dbUser?.followerCount ?? 0,
      followingCount: dbUser?.followingCount ?? 0,
      createdAt: dbUser?.createdAt,
      updatedAt: dbUser?.updatedAt,
    };

    const response = NextResponse.json({ user: merged });

    // Add no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Vary', 'Cookie'); // Prevent proxies from mixing users

    return response;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
