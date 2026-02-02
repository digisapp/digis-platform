import { NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin/admin-service';
import { withAdminParams } from '@/lib/auth/withAdmin';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/role - Update user role
export const POST = withAdminParams<{ userId: string }>(async ({ params, request }) => {
  try {
    const { userId } = await params;
    const { role } = await request.json();

    if (!role || !['fan', 'creator', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await AdminService.updateUserRole(userId, role);

    return NextResponse.json({ success: true, message: 'Role updated successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update role';
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
