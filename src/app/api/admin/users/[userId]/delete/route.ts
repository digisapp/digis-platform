import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/delete - Hard delete user
export const POST = withAdminParams<{ userId: string }>(async ({ user, params }) => {
  try {
    const { userId } = await params;

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user
    const { data: currentUser } = await adminClient
      .from('users')
      .select('username, role')
      .eq('id', userId)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting yourself
    if (userId === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Prevent deleting other admins
    if (currentUser.role === 'admin') {
      return NextResponse.json({ error: 'You cannot delete other admin accounts' }, { status: 400 });
    }

    // Hard delete - remove from database (CASCADE will handle related data)
    const { error: deleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('[ADMIN DELETE] Database delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete user from database' }, { status: 500 });
    }

    // Also delete from Supabase Auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('[ADMIN DELETE] Auth delete error:', authDeleteError);
    }

    console.log(`[ADMIN DELETE] Admin ${user.id} deleted user ${currentUser.username} (${userId})`);

    return NextResponse.json({
      success: true,
      message: 'User account has been permanently deleted',
    });
  } catch (error: any) {
    console.error('[ADMIN DELETE] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
});
