import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateUsername } from '@/lib/utils/username';

const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

export async function POST(request: NextRequest) {
  try {
    const { username: newUsername } = await request.json();

    if (!newUsername) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user from database
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if username is the same
    if (currentUser.username?.toLowerCase() === newUsername.toLowerCase()) {
      return NextResponse.json(
        { error: 'This is already your current username' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameValidation = validateUsername(newUsername);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.error },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.username, newUsername.toLowerCase()),
      ),
    });

    if (existingUser && existingUser.id !== authUser.id) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Check 30-day cooldown
    if (currentUser.usernameLastChangedAt) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.usernameLastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastChange < USERNAME_CHANGE_COOLDOWN_DAYS) {
        const daysRemaining = USERNAME_CHANGE_COOLDOWN_DAYS - daysSinceLastChange;
        return NextResponse.json(
          {
            error: `You can change your username again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
            daysRemaining,
          },
          { status: 400 }
        );
      }
    }

    // Update username and timestamp
    await db.update(users)
      .set({
        username: newUsername.toLowerCase(),
        usernameLastChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, authUser.id));

    // Update Supabase Auth metadata
    await supabase.auth.updateUser({
      data: {
        username: newUsername.toLowerCase(),
      },
    });

    return NextResponse.json({
      success: true,
      username: newUsername.toLowerCase(),
      message: 'Username updated successfully',
    });
  } catch (error) {
    console.error('Update username error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating username' },
      { status: 500 }
    );
  }
}

// GET endpoint to check cooldown status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let canChange = true;
    let daysRemaining = 0;

    if (currentUser.usernameLastChangedAt) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.usernameLastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastChange < USERNAME_CHANGE_COOLDOWN_DAYS) {
        canChange = false;
        daysRemaining = USERNAME_CHANGE_COOLDOWN_DAYS - daysSinceLastChange;
      }
    }

    return NextResponse.json({
      canChange,
      daysRemaining,
      currentUsername: currentUser.username,
      lastChangedAt: currentUser.usernameLastChangedAt,
    });
  } catch (error) {
    console.error('Get username status error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
