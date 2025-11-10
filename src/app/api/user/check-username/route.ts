import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { validateUsernameFormat, isReservedUsername } from '@/lib/reserved-usernames';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = nanoid(10);

  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        failure('Username is required', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Format validation
    const formatCheck = validateUsernameFormat(username);
    if (!formatCheck.valid) {
      return NextResponse.json(
        failure(formatCheck.error || 'Invalid username format', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Reserved username check
    if (isReservedUsername(username)) {
      return NextResponse.json(
        failure('This username is reserved for verified creators. Apply for verification to claim it.', 'reserved', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Check if username already exists (case-insensitive)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        failure('Username already taken', 'taken', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Username is available
    return NextResponse.json(
      success({ available: true }, requestId),
      { headers: { 'x-request-id': requestId } }
    );

  } catch (error: any) {
    console.error('[CHECK_USERNAME_ERROR]', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      failure('Failed to check username availability', 'server', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
