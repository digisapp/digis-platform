import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/messages/conversations - Get all conversations for user
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

    // Add timeout to prevent hanging - return empty array on failure
    try {
      const queryPromise = MessageService.getUserConversations(user.id);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );

      const conversations = await Promise.race([queryPromise, timeoutPromise]);
      return NextResponse.json({ conversations });
    } catch (dbError) {
      console.error('Database error - returning empty conversations:', dbError);
      // Return empty array instead of failing
      return NextResponse.json({ conversations: [] });
    }
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    // Return empty array for graceful degradation
    return NextResponse.json({ conversations: [] });
  }
}
