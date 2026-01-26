import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { isAdminUser } from '@/lib/admin/check-admin';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/delete - Hard delete user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (email first, then DB)
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[ADMIN/DELETE] Attempting to delete user:', userId);

    // Get current user
    const { data: currentUser, error: fetchError } = await adminClient
      .from('users')
      .select('username, role')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('[ADMIN/DELETE] Error fetching user:', fetchError);
    }

    if (!currentUser) {
      console.log('[ADMIN/DELETE] User not found with ID:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[ADMIN/DELETE] Found user:', currentUser.username);

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
      console.error('[ADMIN/DELETE] Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user from database' },
        { status: 500 }
      );
    }

    // Also delete from Supabase Auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('[ADMIN/DELETE] Auth delete error:', authDeleteError);
      // User is already deleted from database, so just log this
    }

    console.log('[ADMIN/DELETE] Successfully deleted user:', currentUser.username);

    return NextResponse.json({
      success: true,
      message: 'User account has been permanently deleted',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
