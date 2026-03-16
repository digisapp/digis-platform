import { NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin/admin-service';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/hide - Toggle hide from discovery
export const POST = withAdminParams<{ userId: string }>(async ({ params }) => {
  try {
    const { userId } = await params;
    const result = await AdminService.toggleHideFromDiscovery(userId);

    return NextResponse.json({
      success: true,
      isHidden: result.isHidden,
      message: `User ${result.isHidden ? 'hidden from' : 'visible in'} discovery`,
    });
  } catch (error: any) {
    console.error('[ADMIN HIDE] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to toggle hide from discovery' },
      { status: 500 }
    );
  }
});
