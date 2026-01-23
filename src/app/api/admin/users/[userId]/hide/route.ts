import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';
import { isAdminUser } from '@/lib/admin/check-admin';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/users/[userId]/hide - Toggle hide from discovery
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

    const result = await AdminService.toggleHideFromDiscovery(userId);

    return NextResponse.json({
      success: true,
      isHidden: result.isHidden,
      message: `User ${result.isHidden ? 'hidden from' : 'visible in'} discovery`,
    });
  } catch (error: any) {
    console.error('Error toggling hide from discovery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle hide from discovery' },
      { status: 500 }
    );
  }
}
