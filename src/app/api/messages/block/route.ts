import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { blockedId, reason } = body;

    if (!blockedId) {
      return NextResponse.json(
        { error: 'Missing blocked user ID' },
        { status: 400 }
      );
    }

    if (user.id === blockedId) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    const result = await MessageService.blockUser(user.id, blockedId, reason);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to block user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const blockedUsers = await MessageService.getBlockedUsers(user.id);

    return NextResponse.json({ blockedUsers });
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get blocked users' },
      { status: 500 }
    );
  }
}
