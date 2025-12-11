import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';
import { isAdminUser } from '@/lib/admin/check-admin';

// GET /api/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (email first, then DB)
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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
    const transformedUsers = users.map((user: any) => ({
      ...user,
      accountStatus: user.accountStatus || 'active',
    }));

    return NextResponse.json({ users: transformedUsers, total });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
