import { NextResponse } from 'next/server';
import { AdminService } from '@/lib/admin/admin-service';
import { withAdmin } from '@/lib/auth/withAdmin';

// GET /api/admin/users - Get all users
export const GET = withAdmin(async ({ request }) => {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as 'fan' | 'creator' | 'admin' | null;
    const status = searchParams.get('status') as 'active' | 'suspended' | 'banned' | null;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { users, total } = await AdminService.getUsers(
      role || undefined,
      search || undefined,
      status || undefined,
      limit,
      offset
    );

    // Drizzle already returns camelCase, just ensure accountStatus has a default
    const transformedUsers = users.map((user: Record<string, unknown>) => ({
      ...user,
      accountStatus: user.accountStatus || 'active',
    }));

    return NextResponse.json({ users: transformedUsers, total });
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
});
