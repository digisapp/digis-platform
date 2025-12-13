import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { contentItems, contentLikes, contentPurchases, users } from '@/db/schema';
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
          return { content: [], userLikes: [] as string[], userPurchases: [] as string[], creatorId: null as string | null };
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

        // Get user's likes and purchases for this content if authenticated
        let userLikes: string[] = [];
        let userPurchases: string[] = [];
        if (currentUser && content.length > 0) {
          const contentIds = content.map(c => c.id);

          // Fetch likes
          const likes = await db.query.contentLikes.findMany({
            where: and(
              eq(contentLikes.userId, currentUser.id),
              inArray(contentLikes.contentId, contentIds)
            ),
            columns: { contentId: true },
          });
          userLikes = likes.map(l => l.contentId);

          // Fetch purchases to check which content is unlocked
          const purchases = await db.query.contentPurchases.findMany({
            where: and(
              eq(contentPurchases.userId, currentUser.id),
              inArray(contentPurchases.contentId, contentIds)
            ),
            columns: { contentId: true },
          });
          userPurchases = purchases.map(p => p.contentId);
        }

        return { content, userLikes, userPurchases, creatorId: user.id };
      },
      { timeoutMs: 3000, retries: 1, tag: 'profileContent' }
    );

    // Add isLiked and hasPurchased to each content item
    const contentWithStatus = result.content.map(item => ({
      ...item,
      isLiked: result.userLikes.includes(item.id),
      // Content is unlocked if: user is the creator, content is free, or user has purchased it
      hasPurchased: result.userPurchases.includes(item.id) || currentUser?.id === result.creatorId,
    }));

    return NextResponse.json({ content: contentWithStatus });
  } catch (error: any) {
    console.error('[PROFILE CONTENT]', error?.message);
    // Fail soft - return empty content
    return NextResponse.json({ content: [] });
  }
}
