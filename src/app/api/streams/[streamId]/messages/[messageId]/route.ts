import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { streamMessages, streams } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/streams/[streamId]/messages/[messageId] - Delete a message (creator or message owner)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string; messageId: string }> }
) {
  try {
    const { streamId, messageId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the stream and message
    const [stream, message] = await Promise.all([
      db.query.streams.findFirst({
        where: eq(streams.id, streamId),
      }),
      db.query.streamMessages.findFirst({
        where: and(
          eq(streamMessages.id, messageId),
          eq(streamMessages.streamId, streamId)
        ),
      }),
    ]);

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Allow deletion if user is stream creator OR the message owner
    const isCreator = stream.creatorId === user.id;
    const isMessageOwner = message.userId === user.id;

    if (!isCreator && !isMessageOwner) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Delete the message
    await db.delete(streamMessages)
      .where(
        and(
          eq(streamMessages.id, messageId),
          eq(streamMessages.streamId, streamId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
