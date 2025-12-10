import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { follows } from '@/lib/data/system';
import { eq, count } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count followers for the current user
    const [result] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, user.id));

    return NextResponse.json({ count: result?.count || 0 });
  } catch (error) {
    console.error('[user/follower-count] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch follower count' }, { status: 500 });
  }
}
