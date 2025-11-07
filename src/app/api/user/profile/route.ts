import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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

    // Use Supabase admin client to query users table
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // If user not found in database, return auth data as fallback
    if (dbError || !dbUser) {
      console.error('Database error - using auth data fallback:', dbError);
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

    return NextResponse.json({ user: dbUser });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
