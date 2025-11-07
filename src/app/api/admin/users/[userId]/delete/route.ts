import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { AdminService } from '@/lib/admin/admin-service';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/delete - Ban/delete user (soft delete)
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

    // Check if user is admin
    const isAdmin = await AdminService.isAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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

    // Soft delete - mark as banned
    const { error: updateError } = await adminClient
      .from('users')
      .update({
        account_status: 'banned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to ban user: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'User account has been banned',
    });
  } catch (error: any) {
    console.error('Error banning user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to ban user' },
      { status: 500 }
    );
  }
}
