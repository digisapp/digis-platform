import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

// GET /api/messages/unread-count - Get total unread message count
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const count = await MessageService.getTotalUnreadCount(user.id);

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
