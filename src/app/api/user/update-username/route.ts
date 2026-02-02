import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateUsername } from '@/lib/utils/username';
import { withOriginGuard } from '@/lib/security/withOriginGuard';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Username change limits
const USERNAME_CHANGE_PERIOD_DAYS = 30; // Rolling 30-day period
const MAX_CHANGES_PER_PERIOD = 2; // Allow 2 changes within the period

// Protected with Origin/Referer validation for CSRF mitigation
export const POST = withOriginGuard(async (request: Request) => {
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

    // Check username change limits (2 changes per 30 days)
    let currentChangeCount = currentUser.username_change_count || 0;
    const lastChangedAt = currentUser.username_last_changed_at;

    if (lastChangedAt) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(lastChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // If more than 30 days have passed, reset the count
      if (daysSinceLastChange >= USERNAME_CHANGE_PERIOD_DAYS) {
        currentChangeCount = 0;
      } else if (currentChangeCount >= MAX_CHANGES_PER_PERIOD) {
        // Still within 30-day period and already used all changes
        const daysRemaining = USERNAME_CHANGE_PERIOD_DAYS - daysSinceLastChange;
        return NextResponse.json(
          {
            error: `You've used your ${MAX_CHANGES_PER_PERIOD} username changes for this month. You can change again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
            daysRemaining,
            changesUsed: currentChangeCount,
            maxChanges: MAX_CHANGES_PER_PERIOD,
          },
          { status: 400 }
        );
      }
    }

    // Update username, timestamp, and increment change count
    const newChangeCount = currentChangeCount + 1;
    const { error: updateError } = await adminClient
      .from('users')
      .update({
        username: newUsername.toLowerCase(),
        username_last_changed_at: new Date().toISOString(),
        username_change_count: newChangeCount,
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
});

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
      .select('username, username_last_changed_at, username_change_count')
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
    let changesUsed = currentUser.username_change_count || 0;
    let changesRemaining = MAX_CHANGES_PER_PERIOD;

    if (currentUser.username_last_changed_at) {
      const daysSinceLastChange = Math.floor(
        (Date.now() - new Date(currentUser.username_last_changed_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastChange >= USERNAME_CHANGE_PERIOD_DAYS) {
        // Period has reset
        changesUsed = 0;
        changesRemaining = MAX_CHANGES_PER_PERIOD;
      } else {
        // Still within 30-day period
        changesRemaining = MAX_CHANGES_PER_PERIOD - changesUsed;
        if (changesUsed >= MAX_CHANGES_PER_PERIOD) {
          canChange = false;
          daysRemaining = USERNAME_CHANGE_PERIOD_DAYS - daysSinceLastChange;
        }
      }
    }

    return NextResponse.json({
      canChange,
      daysRemaining,
      changesUsed,
      changesRemaining,
      maxChanges: MAX_CHANGES_PER_PERIOD,
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
