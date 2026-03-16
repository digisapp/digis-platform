import { NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin/admin-service';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/verify - Toggle creator verification
export const POST = withAdminParams<{ userId: string }>(async ({ params }) => {
  try {
    const { userId } = await params;
    const result = await AdminService.toggleCreatorVerification(userId);

    return NextResponse.json({
      success: true,
      isVerified: result.isVerified,
      message: `User ${result.isVerified ? 'verified' : 'unverified'} successfully`,
    });
  } catch (error: any) {
    console.error('[ADMIN VERIFY] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to toggle verification' },
      { status: 500 }
    );
  }
});
