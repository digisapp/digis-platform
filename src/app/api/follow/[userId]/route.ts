import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FollowService } from '@/lib/explore/follow-service';

// POST /api/follow/[userId] - Follow a user
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

    await FollowService.followUser(user.id, userId);

    return NextResponse.json({
      success: true,
      message: 'Successfully followed user'
    });
  } catch (error: any) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to follow user' },
      { status: 400 }
    );
  }
}

// DELETE /api/follow/[userId] - Unfollow a user
export async function DELETE(
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

    await FollowService.unfollowUser(user.id, userId);

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user'
    });
  } catch (error: any) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unfollow user' },
      { status: 400 }
    );
  }
}
