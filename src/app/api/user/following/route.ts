import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FollowService } from '@/lib/explore/follow-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/user/following - Get users current user is following
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const following = await FollowService.getFollowing(user.id, limit, offset);

    return NextResponse.json({
      following,
      count: following.length,
    });
  } catch (error: any) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch following' },
      { status: 500 }
    );
  }
}
