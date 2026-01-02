import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { validateUsernameFormat, isReservedUsername, getReservedReason } from '@/lib/reserved-usernames';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only endpoint to check username availability and reserved status
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

    if (!admin || (admin.role !== 'admin' && !admin.isAdmin)) {
      return NextResponse.json(
        failure('Admin access required', 'auth', requestId),
        { status: 403, headers: { 'x-request-id': requestId } }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        failure('Username is required', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Validate format
    const formatCheck = validateUsernameFormat(username);
    if (!formatCheck.valid) {
      return NextResponse.json(
        success({
          available: false,
          isReserved: false,
          reservedReason: null,
          formatError: formatCheck.error,
          takenBy: null,
        }, requestId),
        { headers: { 'x-request-id': requestId } }
      );
    }

    // Check if taken
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
      columns: {
        id: true,
        email: true,
        displayName: true,
        role: true,
      },
    });

    // Check reserved status
    const reserved = isReservedUsername(username);
    const reservedReason = getReservedReason(username);

    return NextResponse.json(
      success({
        available: !existingUser,
        isReserved: reserved,
        reservedReason: reservedReason,
        formatError: null,
        takenBy: existingUser ? {
          id: existingUser.id,
          email: existingUser.email,
          displayName: existingUser.displayName,
          role: existingUser.role,
        } : null,
      }, requestId),
      { headers: { 'x-request-id': requestId } }
    );

  } catch (error: any) {
    console.error('[ADMIN_CHECK_USERNAME_ERROR]', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      failure('Failed to check username', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
