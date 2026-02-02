import { NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin/admin-service';
import { withAdmin } from '@/lib/auth/withAdmin';

// GET /api/admin/stats - Get platform statistics
export const GET = withAdmin(async () => {
  try {
    const stats = await AdminService.getStatistics();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
});
