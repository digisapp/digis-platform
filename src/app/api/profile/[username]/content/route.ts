import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { contentItems, contentLikes, users } from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch published content for a creator's profile
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  try {
    const params = await props.params;
    const username = params.username;

    // Get current user if authenticated (for like status)
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Find user and content with timeout
    const result = await withTimeoutAndRetry(
      async () => {
        // Find user first (case-insensitive)
        const user = await db.query.users.findFirst({
          where: sql`lower(${users.username}) = lower(${username})`,
          columns: { id: true, role: true },
        });

        if (!user || user.role !== 'creator') {
          return { content: [], userLikes: [] };
        }

        // Fetch published content
        const content = await db.query.contentItems.findMany({
          where: and(
            eq(contentItems.creatorId, user.id),
            eq(contentItems.isPublished, true)
          ),
          orderBy: [desc(contentItems.createdAt)],
          limit: 20,
        });

        // Get user's likes for this content if authenticated
        let userLikes: string[] = [];
        if (currentUser && content.length > 0) {
          const contentIds = content.map(c => c.id);
          const likes = await db.query.contentLikes.findMany({
            where: and(
              eq(contentLikes.userId, currentUser.id),
              inArray(contentLikes.contentId, contentIds)
            ),
            columns: { contentId: true },
          });
          userLikes = likes.map(l => l.contentId);
        }

        return { content, userLikes };
      },
      { timeoutMs: 3000, retries: 1, tag: 'profileContent' }
    );

    // Add isLiked to each content item
    const contentWithLikes = result.content.map(item => ({
      ...item,
      isLiked: result.userLikes.includes(item.id),
    }));

    return NextResponse.json({ content: contentWithLikes });
  } catch (error: any) {
    console.error('[PROFILE CONTENT]', error?.message);
    // Fail soft - return empty content
    return NextResponse.json({ content: [] });
  }
}
