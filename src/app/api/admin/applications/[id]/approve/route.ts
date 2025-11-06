import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';

// POST /api/admin/applications/[id]/approve - Approve application
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    await AdminService.approveApplication(id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Application approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving application:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve application' },
      { status: 400 }
    );
  }
}
