import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { notifications } from '@/lib/data/system';
import { eq, desc, and, or, inArray } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { success, degraded } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/notifications - Get all notifications for the user
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'all', 'earnings' (tip/gift/stream_tip), 'followers'
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
      const userNotifications = await withTimeoutAndRetry(
        async () => {
          let query = db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, user.id))
            .$dynamic();

          // Filter by category
          if (category && category !== 'all') {
            if (category === 'earnings') {
              // Include tip, gift, stream_tip, and earnings types
              query = query.where(
                and(
                  eq(notifications.userId, user.id),
                  inArray(notifications.type, ['earnings', 'tip', 'gift', 'stream_tip'])
                )
              );
            } else {
              // Exact match for other categories
              query = query.where(
                and(
                  eq(notifications.userId, user.id),
                  eq(notifications.type, category)
                )
              );
            }
          }

          // Filter by unread
          if (unreadOnly) {
            query = query.where(
              and(
                eq(notifications.userId, user.id),
                eq(notifications.isRead, false)
              )
            );
          }

          return await query
            .orderBy(desc(notifications.createdAt))
            .limit(limit);
        },
        {
          timeoutMs: 5000,
          retries: 2,
          tag: 'getUserNotifications'
        }
      );

      return NextResponse.json(
        success({
          notifications: userNotifications,
        }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    } catch (dbError) {
      console.error('[NOTIFICATIONS]', {
        requestId,
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
      });

      return NextResponse.json(
        degraded(
          { notifications: [] },
          'Failed to fetch notifications',
          'timeout',
          requestId
        ),
        { headers: { 'x-request-id': requestId } }
      );
    }
  } catch (error: any) {
    console.error('[NOTIFICATIONS]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/mark-all-read - Mark all as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all as read' },
      { status: 500 }
    );
  }
}
