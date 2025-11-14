import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { contentItems, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // Find the user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'creator') {
      return NextResponse.json({ error: 'User is not a creator' }, { status: 404 });
    }

    // Fetch published content
    const content = await db.query.contentItems.findMany({
      where: and(
        eq(contentItems.creatorId, user.id),
        eq(contentItems.isPublished, true)
      ),
      orderBy: [desc(contentItems.createdAt)],
      limit: 20, // Limit to 20 most recent items
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('[PROFILE CONTENT GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
