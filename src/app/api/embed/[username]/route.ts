import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * GET /api/embed/[username]
 * Public API for embeddable creator data.
 * Returns minimal profile info for external embed widgets.
 * CORS enabled for cross-origin embedding.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const creator = await db.query.users.findFirst({
      where: and(
        eq(users.username, username),
        eq(users.role, 'creator'),
        eq(users.accountStatus, 'active'),
      ),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isCreatorVerified: true,
        followerCount: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404, headers: corsHeaders() });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://digis.cc';

    return NextResponse.json({
      username: creator.username,
      displayName: creator.displayName,
      avatarUrl: creator.avatarUrl,
      bio: creator.bio,
      isVerified: creator.isCreatorVerified || false,
      profileUrl: `${baseUrl}/${creator.username}`,
      embedVersion: '1.0',
    }, {
      headers: corsHeaders(),
    });
  } catch (error) {
    console.error('[Embed API]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500, headers: corsHeaders() });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  };
}
