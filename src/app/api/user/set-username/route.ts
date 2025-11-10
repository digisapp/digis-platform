import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401, headers: { 'x-request-id': requestId } }
      );
    }

    const { username, displayName } = await request.json();

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
        failure('This username is reserved for verified creators. Apply for verification to claim it.', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        failure('Username already taken', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Check if user already has a username set
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (currentUser?.username) {
      return NextResponse.json(
        failure('Username already set. Contact support to change it.', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Update user with username and display name
    await db.update(users)
      .set({
        username: username.toLowerCase(),
        displayName: displayName || username,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    console.log('[SET_USERNAME_SUCCESS]', {
      requestId,
      userId: user.id,
      username: username.toLowerCase()
    });

    return NextResponse.json(
      success({ username: username.toLowerCase(), displayName: displayName || username }, requestId),
      { headers: { 'x-request-id': requestId } }
    );

  } catch (error: any) {
    console.error('[SET_USERNAME_ERROR]', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      failure('Failed to set username', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
