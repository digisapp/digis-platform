import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/db/schema';
import { eq, ilike, or, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Search for creators by username or display name
 * Used for adding featured creators to streams
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 2) {
      return NextResponse.json({ creators: [] });
    }

    // Search for creators by username or display name
    const creators = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isCreatorVerified: users.isCreatorVerified,
        followerCount: users.followerCount,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'creator'),
          eq(users.accountStatus, 'active'), // Hide suspended/banned creators
          or(
            ilike(users.username, `%${query}%`),
            ilike(users.displayName, `%${query}%`)
          )
        )
      )
      .limit(limit);

    // Filter out current user from results
    const filteredCreators = creators.filter(c => c.id !== user.id);

    return NextResponse.json({ creators: filteredCreators });
  } catch (error: any) {
    console.error('[CREATOR SEARCH ERROR]', error);
    return NextResponse.json({ error: 'Failed to search creators' }, { status: 500 });
  }
}
