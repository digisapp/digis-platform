import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { messages, messageReactions, conversations, VALID_REACTION_EMOJIS } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/messages/[messageId]/react - Add reaction to a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { emoji } = await req.json();

    // Validate emoji
    if (!emoji || !VALID_REACTION_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: `Invalid emoji. Must be one of: ${VALID_REACTION_EMOJIS.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if message exists and user has access
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
      with: {
        conversation: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Verify user is participant in conversation
    const conv = message.conversation;
    if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if user already has this reaction on this message
    const existing = await db.query.messageReactions.findFirst({
      where: and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, user.id),
        eq(messageReactions.emoji, emoji)
      ),
    });

    if (existing) {
      // Already reacted with this emoji - return success (idempotent)
      return NextResponse.json({ reaction: existing });
    }

    // Add the reaction
    const [reaction] = await db
      .insert(messageReactions)
      .values({
        messageId,
        userId: user.id,
        emoji,
      })
      .returning();

    return NextResponse.json({ reaction });
  } catch (error: any) {
    console.error('[messages/react] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/[messageId]/react - Remove reaction from a message
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { emoji } = await req.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Delete the reaction (only own reactions)
    await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, user.id),
          eq(messageReactions.emoji, emoji)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[messages/react] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}

// GET /api/messages/[messageId]/react - Get reactions for a message
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;

    // Get all reactions for this message
    const reactions = await db.query.messageReactions.findMany({
      where: eq(messageReactions.messageId, messageId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: (r, { asc }) => [asc(r.createdAt)],
    });

    // Group reactions by emoji
    const grouped: Record<string, { emoji: string; count: number; users: any[]; userReacted: boolean }> = {};

    for (const reaction of reactions) {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          userReacted: false,
        };
      }

      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].users.push(reaction.user);

      if (reaction.userId === user.id) {
        grouped[reaction.emoji].userReacted = true;
      }
    }

    return NextResponse.json({
      reactions: Object.values(grouped),
    });
  } catch (error: any) {
    console.error('[messages/react] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get reactions' },
      { status: 500 }
    );
  }
}
