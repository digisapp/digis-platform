import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@/lib/utils/username';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USERNAME_CHANGE_COOLDOWN_DAYS = 60; // Industry standard (same as Twitch)

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

    // Use admin client for database operations
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user from database
    const { data: currentUser, error: fetchError } = await adminClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (fetchError || !currentUser) {
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
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('username', newUsername.toLowerCase())
      .single();

    if (existingUser && existingUser.id !== authUser.id) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Check 30-day cooldown
    if (currentUser.username_last_changed_at) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.username_last_changed_at).getTime()) / (1000 * 60 * 60 * 24)
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
    const { error: updateError } = await adminClient
      .from('users')
      .update({
        username: newUsername.toLowerCase(),
        username_last_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id);

    if (updateError) {
      throw updateError;
    }

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

    // Use admin client for database operations
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: currentUser, error: fetchError } = await adminClient
      .from('users')
      .select('username, username_last_changed_at')
      .eq('id', authUser.id)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let canChange = true;
    let daysRemaining = 0;

    if (currentUser.username_last_changed_at) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.username_last_changed_at).getTime()) / (1000 * 60 * 60 * 24)
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
      lastChangedAt: currentUser.username_last_changed_at,
    });
  } catch (error) {
    console.error('Get username status error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
