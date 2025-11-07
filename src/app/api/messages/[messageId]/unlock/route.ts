import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { messageId } = await params;

    const result = await MessageService.unlockMessage(user.id, messageId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error unlocking message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unlock message' },
      { status: 500 }
    );
  }
}
