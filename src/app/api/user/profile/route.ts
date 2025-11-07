import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database with fallback
    let dbUser;
    try {
      dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });
    } catch (dbError) {
      console.error('Database error - using auth data fallback:', dbError);
      // Return minimal user data from Supabase auth if database fails
      dbUser = {
        id: user.id,
        email: user.email!,
        username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
        displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
        role: 'fan',
      };
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
