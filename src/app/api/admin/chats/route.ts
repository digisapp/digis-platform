import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { conversations } from '@/db/schema/messages';
import { users } from '@/db/schema/users';
import { messages } from '@/db/schema/messages';
import { eq, or, ilike, desc, sql, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async ({ request }) => {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const user1 = alias(users, 'user1');
    const user2 = alias(users, 'user2');

    // Build search condition
    const searchCondition = search.trim()
      ? or(
          ilike(user1.displayName, `%${search}%`),
          ilike(user1.username, `%${search}%`),
          ilike(user2.displayName, `%${search}%`),
          ilike(user2.username, `%${search}%`)
        )
      : undefined;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(conversations)
      .innerJoin(user1, eq(conversations.user1Id, user1.id))
      .innerJoin(user2, eq(conversations.user2Id, user2.id))
      .where(searchCondition);

    // Get conversations with participant info
    const rows = await db
      .select({
        id: conversations.id,
        lastMessageText: conversations.lastMessageText,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        user1Id: user1.id,
        user1Username: user1.username,
        user1DisplayName: user1.displayName,
        user1AvatarUrl: user1.avatarUrl,
        user1Role: user1.role,
        user2Id: user2.id,
        user2Username: user2.username,
        user2DisplayName: user2.displayName,
        user2AvatarUrl: user2.avatarUrl,
        user2Role: user2.role,
      })
      .from(conversations)
      .innerJoin(user1, eq(conversations.user1Id, user1.id))
      .innerJoin(user2, eq(conversations.user2Id, user2.id))
      .where(searchCondition)
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit)
      .offset(offset);

    // Get message counts for these conversations
    const conversationIds = rows.map(r => r.id);
    const messageCounts = conversationIds.length > 0
      ? await db
          .select({
            conversationId: messages.conversationId,
            count: count(),
          })
          .from(messages)
          .where(sql`${messages.conversationId} = ANY(${conversationIds})`)
          .groupBy(messages.conversationId)
      : [];

    const countMap = new Map(messageCounts.map(mc => [mc.conversationId, mc.count]));

    const conversationsList = rows.map(r => ({
      id: r.id,
      lastMessageText: r.lastMessageText,
      lastMessageAt: r.lastMessageAt,
      createdAt: r.createdAt,
      messageCount: countMap.get(r.id) || 0,
      user1: {
        id: r.user1Id,
        username: r.user1Username,
        displayName: r.user1DisplayName,
        avatarUrl: r.user1AvatarUrl,
        role: r.user1Role,
      },
      user2: {
        id: r.user2Id,
        username: r.user2Username,
        displayName: r.user2DisplayName,
        avatarUrl: r.user2AvatarUrl,
        role: r.user2Role,
      },
    }));

    // Get aggregate stats
    const [stats] = await db
      .select({
        totalConversations: count(),
      })
      .from(conversations);

    const [msgStats] = await db
      .select({
        totalMessages: count(),
      })
      .from(messages);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [activeToday] = await db
      .select({ count: count() })
      .from(conversations)
      .where(sql`${conversations.lastMessageAt} >= ${today}`);

    return NextResponse.json({
      conversations: conversationsList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalConversations: stats.totalConversations,
        totalMessages: msgStats.totalMessages,
        activeToday: activeToday.count,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching admin chats:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
});
