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
 * Supports pagination with limit and offset query params
 * ?limit=12&offset=0&type=photo|video (optional type filter)
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ username: string }> }
) {
  try {
    const params = await props.params;
    const username = params.username;
    const searchParams = request.nextUrl.searchParams;

    // Pagination params
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50); // Max 50
    const offset = parseInt(searchParams.get('offset') || '0');
    const contentType = searchParams.get('type'); // 'photo' or 'video' (optional)

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
          return { content: [], userLikes: [] as string[], userPurchases: [] as string[], creatorId: null as string | null, totalCount: 0 };
        }

        // Build where clause
        const whereConditions = [
          eq(contentItems.creatorId, user.id),
          eq(contentItems.isPublished, true)
        ];

        // Add content type filter if specified
        if (contentType === 'photo') {
          whereConditions.push(eq(contentItems.contentType, 'photo'));
        } else if (contentType === 'video') {
          whereConditions.push(eq(contentItems.contentType, 'video'));
        }

        // Get total count for pagination
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(contentItems)
          .where(and(...whereConditions));
        const totalCount = Number(countResult[0]?.count || 0);

        // Fetch published content with pagination
        const content = await db.query.contentItems.findMany({
          where: and(...whereConditions),
          orderBy: [desc(contentItems.createdAt)],
          limit: limit + 1, // Fetch one extra to check if there's more
          offset,
        });

        // Get user's likes and purchases for this content if authenticated
        let userLikes: string[] = [];
        let userPurchases: string[] = [];
        if (currentUser && content.length > 0) {
          const contentIds = content.map(c => c.id);

          // Fetch likes and purchases in parallel
          const [likes, purchases] = await Promise.all([
            db.query.contentLikes.findMany({
              where: and(
                eq(contentLikes.userId, currentUser.id),
                inArray(contentLikes.contentId, contentIds)
              ),
              columns: { contentId: true },
            }),
            db.query.contentPurchases.findMany({
              where: and(
                eq(contentPurchases.userId, currentUser.id),
                inArray(contentPurchases.contentId, contentIds)
              ),
              columns: { contentId: true },
            })
          ]);

          userLikes = likes.map(l => l.contentId);
          userPurchases = purchases.map(p => p.contentId);
        }

        return { content, userLikes, userPurchases, creatorId: user.id, totalCount };
      },
      { timeoutMs: 5000, retries: 1, tag: 'profileContent' }
    );

    // Check if there's more content
    const hasMore = result.content.length > limit;
    const contentToReturn = hasMore ? result.content.slice(0, limit) : result.content;

    // Add isLiked and hasPurchased to each content item
    const contentWithStatus = contentToReturn.map(item => ({
      ...item,
      isLiked: result.userLikes.includes(item.id),
      // Content is unlocked if: user is the creator, content is free, or user has purchased it
      hasPurchased: result.userPurchases.includes(item.id) || currentUser?.id === result.creatorId,
    }));

    return NextResponse.json({
      content: contentWithStatus,
      hasMore,
      totalCount: result.totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[PROFILE CONTENT]', error?.message);
    // Fail soft - return empty content
    return NextResponse.json({ content: [], hasMore: false, totalCount: 0 });
  }
}
