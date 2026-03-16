import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/suspend - Suspend or unsuspend user
export const POST = withAdminParams<{ userId: string }>(async ({ user, params, request }) => {
  try {
    const { userId } = await params;
    const { action } = await request.json(); // 'suspend' or 'unsuspend'

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user
    const { data: currentUser } = await adminClient
      .from('users')
      .select('account_status, username')
      .eq('id', userId)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent suspending yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot suspend your own account' }, { status: 400 });
    }

    const newStatus = action === 'suspend' ? 'suspended' : 'active';

    const { error: updateError } = await adminClient
      .from('users')
      .update({
        account_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[ADMIN SUSPEND] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully`,
    });
  } catch (error: any) {
    console.error('[ADMIN SUSPEND] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
});
