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

    let count = 0;
    try {
      count = await MessageService.getTotalUnreadCount(user.id);
    } catch (dbError) {
      console.error('Database error - returning zero unread count:', dbError);
      // Return 0 if database fails - better than crashing
    }

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    // Return 0 instead of error to prevent navigation crash
    return NextResponse.json({ count: 0 });
  }
}
