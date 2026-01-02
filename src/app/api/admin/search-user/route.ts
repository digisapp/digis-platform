import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq, or, ilike } from 'drizzle-orm';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only endpoint to search for users by email or username
 */
export async function GET(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    // Verify admin authentication
    const supabase = await createClient();
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !adminUser) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    // Verify admin role
    const admin = await db.query.users.findFirst({
      where: eq(users.id, adminUser.id),
    });

    if (!admin || admin.role !== 'admin') {
      return NextResponse.json(
        failure('Admin access required', 'auth', requestId),
        { status: 403, headers: { 'x-request-id': requestId } }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json(
        failure('Search query must be at least 2 characters', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Search by email or username (case-insensitive)
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
    console.error('[ADMIN_SEARCH_USER_ERROR]', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      failure('Failed to search users', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
