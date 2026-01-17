import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/user/heartbeat
 * Updates the user's last_seen_at timestamp
 * Called from middleware or client-side to track user activity
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update last_seen_at using Drizzle (bypasses RLS issues)
    await db
      .update(users)
      .set({
        lastSeenAt: new Date(),
        isOnline: true,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json(
      { error: 'Failed to update heartbeat' },
      { status: 500 }
    );
  }
}
