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
    const { blockedId } = body;

    if (!blockedId) {
      return NextResponse.json(
        { error: 'Missing blocked user ID' },
        { status: 400 }
      );
    }

    const result = await MessageService.unblockUser(user.id, blockedId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unblock user' },
      { status: 500 }
    );
  }
}
