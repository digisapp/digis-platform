import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/withAdmin';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { validateUsernameFormat, isReservedUsername } from '@/lib/reserved-usernames';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-only endpoint to assign usernames (including reserved ones) to users
 * Used for:
 * - Assigning reserved names to verified creators
 * - Changing usernames for special cases
 * - Fixing username issues
 */
export const POST = withAdmin(async ({ user: adminUser, request }) => {
  const requestId = nanoid(10);

  try {
    const { userId, identifier, username, newUsername, verifyCreator } = await request.json();

    // Support both old and new parameter names
    const targetUserId = userId || identifier;
    const targetUsername = username || newUsername;

    if (!targetUserId || !targetUsername) {
      return NextResponse.json(
        failure('userId/identifier and username/newUsername are required', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Format validation
    const formatCheck = validateUsernameFormat(targetUsername);
    if (!formatCheck.valid) {
      return NextResponse.json(
        failure(formatCheck.error || 'Invalid username format', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Check if username is already taken by someone else
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, targetUsername.toLowerCase()),
    });

    if (existingUser && existingUser.id !== targetUserId) {
      return NextResponse.json(
        failure('Username already taken by another user', 'validation', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json(
        failure('User not found', 'validation', requestId),
        { status: 404, headers: { 'x-request-id': requestId } }
      );
    }

    // Check if this is a reserved name
    const isReserved = isReservedUsername(targetUsername);

    // Build update object
    const updateData: Record<string, unknown> = {
      username: targetUsername.toLowerCase(),
      updatedAt: new Date(),
    };

    // If assigning a reserved name, auto-verify the creator
    if (verifyCreator) {
      updateData.isCreatorVerified = true;
      updateData.role = 'creator';
    }

    // Update user
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, targetUserId));

    console.log('[ADMIN_SET_USERNAME]', {
      requestId,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      userId: targetUserId,
      oldUsername: targetUser.username,
      newUsername: targetUsername.toLowerCase(),
      isReserved,
      verified: updateData.isCreatorVerified || false,
    });

    return NextResponse.json(
      success({
        username: targetUsername.toLowerCase(),
        wasReserved: isReserved,
        verified: updateData.isCreatorVerified || false,
      }, requestId),
      { headers: { 'x-request-id': requestId } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SET_USERNAME_ERROR]', {
      requestId,
      error: message,
    });

    return NextResponse.json(
      failure('Failed to set username', 'unknown', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
});
