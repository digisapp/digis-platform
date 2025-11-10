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

/**
 * Admin-only endpoint to assign usernames (including reserved ones) to users
 * Used for:
 * - Assigning reserved names to verified creators
 * - Changing usernames for special cases
 * - Fixing username issues
 */
export async function POST(request: NextRequest) {
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

    const { userId, username, verifyCreator } = await request.json();

    if (!userId || !username) {
      return NextResponse.json(
        failure('userId and username are required', 'validation', requestId),
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

    // Check if username is already taken by someone else
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (existingUser && existingUser.id !== userId) {
      return NextResponse.json(
        failure('Username already taken by another user', 'taken', requestId),
        { status: 400, headers: { 'x-request-id': requestId } }
      );
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return NextResponse.json(
        failure('User not found', 'not_found', requestId),
        { status: 404, headers: { 'x-request-id': requestId } }
      );
    }

    // Check if this is a reserved name
    const isReserved = isReservedUsername(username);

    // Build update object
    const updateData: any = {
      username: username.toLowerCase(),
      updatedAt: new Date(),
    };

    // If assigning a reserved name, auto-verify the creator
    if (isReserved && verifyCreator) {
      updateData.isCreatorVerified = true;
      updateData.role = 'creator'; // Ensure they're a creator
    } else if (verifyCreator) {
      updateData.isCreatorVerified = true;
      updateData.role = 'creator';
    }

    // Update user
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    console.log('[ADMIN_SET_USERNAME]', {
      requestId,
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      userId,
      oldUsername: targetUser.username,
      newUsername: username.toLowerCase(),
      isReserved,
      verified: updateData.isCreatorVerified || false,
    });

    return NextResponse.json(
      success({
        username: username.toLowerCase(),
        wasReserved: isReserved,
        verified: updateData.isCreatorVerified || false,
      }, requestId),
      { headers: { 'x-request-id': requestId } }
    );

  } catch (error: any) {
    console.error('[ADMIN_SET_USERNAME_ERROR]', {
      requestId,
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      failure('Failed to set username', 'server', requestId),
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
