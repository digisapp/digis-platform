import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { messages } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';

// DELETE /api/messages/[messageId] - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the message and verify ownership
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Only the sender can delete their own messages
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // If message has media, delete from storage
    if (message.mediaUrl) {
      try {
        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
        const url = new URL(message.mediaUrl);
        const pathParts = url.pathname.split('/storage/v1/object/public/');

        if (pathParts.length > 1) {
          const fullPath = pathParts[1]; // e.g., "messages/user-id/filename.jpg"
          const [bucket, ...filePathParts] = fullPath.split('/');
          const filePath = filePathParts.join('/');

          if (bucket && filePath) {
            const { error: storageError } = await supabase.storage
              .from(bucket)
              .remove([filePath]);

            if (storageError) {
              console.error('Error deleting media from storage:', storageError);
              // Continue with message deletion even if storage deletion fails
            }
          }
        }
      } catch (storageError) {
        console.error('Error parsing media URL for deletion:', storageError);
        // Continue with message deletion even if storage deletion fails
      }

      // Also try to delete thumbnail if exists
      if (message.thumbnailUrl) {
        try {
          const thumbnailUrl = new URL(message.thumbnailUrl);
          const pathParts = thumbnailUrl.pathname.split('/storage/v1/object/public/');

          if (pathParts.length > 1) {
            const fullPath = pathParts[1];
            const [bucket, ...filePathParts] = fullPath.split('/');
            const filePath = filePathParts.join('/');

            if (bucket && filePath) {
              await supabase.storage.from(bucket).remove([filePath]);
            }
          }
        } catch (e) {
          // Ignore thumbnail deletion errors
        }
      }
    }

    // Delete the message from database
    await db.delete(messages).where(eq(messages.id, messageId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
