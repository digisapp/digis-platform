import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, hubCreatorStreaks } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Get creator's current streak
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const streak = await db.query.hubCreatorStreaks.findFirst({
      where: eq(hubCreatorStreaks.creatorId, user.id),
    });

    return NextResponse.json({
      streak: streak ? {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        lastActiveDate: streak.lastActiveDate,
      } : {
        current: 0,
        longest: 0,
        lastActiveDate: null,
      },
    });
  } catch (error: any) {
    console.error('[HUB STREAK GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
