import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { notifications } from '@/lib/data/system';
import { eq, and, count } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/notifications/unread-count - Get count of unread notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false)
        )
      );

    return NextResponse.json({
      count: result[0]?.count || 0
    });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count', count: 0 },
      { status: 500 }
    );
  }
}
