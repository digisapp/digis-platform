import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        authError: authError?.message
      }, { status: 401 });
    }

    // Query database user
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    return NextResponse.json({
      debug: {
        authUserId: user.id,
        authUserEmail: user.email,
        authUserMetadata: user.user_metadata,
        dbUserFound: !!dbUser,
        dbUserEmail: dbUser?.email,
        dbUserUsername: dbUser?.username,
        dbUserRole: dbUser?.role,
        dbUserVerified: dbUser?.isCreatorVerified,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
