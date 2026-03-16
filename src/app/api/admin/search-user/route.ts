import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { or, ilike } from 'drizzle-orm';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only endpoint to search for users by email or username
 */
export const GET = withAdmin(async ({ request }) => {
  const requestId = nanoid(10);

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json(
        failure('Search query must be at least 2 characters', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    const searchResults = await db.query.users.findMany({
      where: or(
        ilike(users.email, `%${query}%`),
        ilike(users.username, `%${query}%`),
        ilike(users.displayName, `%${query}%`)
      ),
      columns: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isCreatorVerified: true,
      },
      limit: 10,
    });

    return NextResponse.json(
      success({ users: searchResults }, requestId),
      { headers: { 'x-request-id': requestId } }
    );
  } catch (error: any) {
    console.error('[ADMIN SEARCH USER] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      failure('Failed to search users', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
});
