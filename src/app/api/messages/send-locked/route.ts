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
    const { conversationId, content, unlockPrice, mediaUrl, mediaType, thumbnailUrl } = body;

    if (!conversationId || !content || !unlockPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (unlockPrice < 1) {
      return NextResponse.json(
        { error: 'Unlock price must be at least 1 coin' },
        { status: 400 }
      );
    }

    const message = await MessageService.sendLockedMessage(
      conversationId,
      user.id,
      content,
      unlockPrice,
      mediaUrl,
      mediaType,
      thumbnailUrl
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending locked message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send locked message' },
      { status: 500 }
    );
  }
}
