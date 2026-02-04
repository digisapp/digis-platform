import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { messages, conversations, users } from '@/lib/data/system';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/search - Search messages across all user's conversations
 *
 * Query params:
 * - q: Search query (required, min 2 chars)
 * - conversationId: Optional - limit search to specific conversation
 * - limit: Max results (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const conversationId = searchParams.get('conversationId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Get all conversation IDs the user is part of
    const userConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.user1Id, user.id),
          eq(conversations.user2Id, user.id)
        )
      );

    const conversationIds = userConversations.map(c => c.id);

    if (conversationIds.length === 0) {
      return NextResponse.json({ results: [], total: 0 });
    }

    // If specific conversation requested, verify user has access
    if (conversationId && !conversationIds.includes(conversationId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build search condition
    const searchConversationIds = conversationId ? [conversationId] : conversationIds;

    // Search messages using ILIKE for case-insensitive search
    const results = await db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        content: messages.content,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        sender: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          sql`${messages.conversationId} = ANY(${searchConversationIds})`,
          ilike(messages.content, `%${query}%`)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // Get conversation details in a single batch query (avoiding N+1)
    const uniqueConversationIds = [...new Set(results.map(r => r.conversationId))];
    const conversationDetailsMap = new Map<string, { otherUser: any }>();

    if (uniqueConversationIds.length > 0) {
      const convDetails = await db.query.conversations.findMany({
        where: sql`${conversations.id} = ANY(${uniqueConversationIds})`,
        with: {
          user1: {
            columns: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          user2: {
            columns: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      for (const conv of convDetails) {
        const otherUser = conv.user1Id === user.id ? conv.user2 : conv.user1;
        conversationDetailsMap.set(conv.id, { otherUser });
      }
    }

    // Enrich results with conversation info
    const enrichedResults = results.map(result => ({
      ...result,
      conversation: conversationDetailsMap.get(result.conversationId),
    }));

    return NextResponse.json({
      results: enrichedResults,
      total: enrichedResults.length,
      query,
    });
  } catch (error: any) {
    console.error('[MESSAGE SEARCH ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
}
