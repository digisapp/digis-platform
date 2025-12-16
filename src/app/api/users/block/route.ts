import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BlockService } from '@/lib/services/block-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/users/block - Block a user globally
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, reason } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await BlockService.blockUser(user.id, userId, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/block - Unblock a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await BlockService.unblockUser(user.id, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}

/**
 * GET /api/users/block - Get blocked users list or check block status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checkUserId = searchParams.get('checkUserId');

    // If checkUserId provided, return block status between current user and that user
    if (checkUserId) {
      const status = await BlockService.getBlockStatus(user.id, checkUserId);
      return NextResponse.json(status);
    }

    // Otherwise return full list of blocked users
    const blockedUsers = await BlockService.getBlockedUsers(user.id);
    return NextResponse.json({ blockedUsers });
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return NextResponse.json({ error: 'Failed to get blocked users' }, { status: 500 });
  }
}
