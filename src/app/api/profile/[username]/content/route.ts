import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { contentItems, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
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

    // Find user and content with timeout
    const content = await withTimeoutAndRetry(
      async () => {
        // Find user first (case-insensitive)
        const user = await db.query.users.findFirst({
          where: sql`lower(${users.username}) = lower(${username})`,
          columns: { id: true, role: true },
        });

        if (!user || user.role !== 'creator') {
          return [];
        }

        // Fetch published content
        return db.query.contentItems.findMany({
          where: and(
            eq(contentItems.creatorId, user.id),
            eq(contentItems.isPublished, true)
          ),
          orderBy: [desc(contentItems.createdAt)],
          limit: 20,
        });
      },
      { timeoutMs: 3000, retries: 1, tag: 'profileContent' }
    );

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[PROFILE CONTENT]', error?.message);
    // Fail soft - return empty content
    return NextResponse.json({ content: [] });
  }
}
