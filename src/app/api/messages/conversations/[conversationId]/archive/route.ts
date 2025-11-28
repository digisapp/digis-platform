import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Archive a conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    await MessageService.archiveConversation(conversationId, user.id, true);

    return NextResponse.json({ success: true, archived: true });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to archive conversation' },
      { status: 500 }
    );
  }
}

// DELETE - Unarchive a conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    await MessageService.archiveConversation(conversationId, user.id, false);

    return NextResponse.json({ success: true, archived: false });
  } catch (error) {
    console.error('Error unarchiving conversation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unarchive conversation' },
      { status: 500 }
    );
  }
}
