import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { userBlocks, users } from '@/db/schema/users';
import { streamBans, streams } from '@/db/schema/streams';
import { eq, desc, sql, count } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/moderation - Get moderation data (blocks and bans)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get users blocked by multiple creators (most blocked first)
    const mostBlockedUsers = await db
      .select({
        blockedId: userBlocks.blockedId,
        blockCount: count(userBlocks.id).as('block_count'),
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        email: users.email,
      })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedId, users.id))
      .groupBy(userBlocks.blockedId, users.id, users.username, users.displayName, users.avatarUrl, users.email)
      .orderBy(desc(sql`block_count`))
      .limit(50);

    // Get recent blocks with full details
    const recentBlocks = await db
      .select({
        id: userBlocks.id,
        blockedId: userBlocks.blockedId,
        blockerId: userBlocks.blockerId,
        reason: userBlocks.reason,
        createdAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .orderBy(desc(userBlocks.createdAt))
      .limit(100);

    // Enrich with user details
    const blockerIds = [...new Set(recentBlocks.map(b => b.blockerId))];
    const blockedIds = [...new Set(recentBlocks.map(b => b.blockedId))];
    const allUserIds = [...new Set([...blockerIds, ...blockedIds])];

    const usersData = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(sql`${users.id} IN ${allUserIds.length > 0 ? sql`(${sql.join(allUserIds.map(id => sql`${id}`), sql`, `)})` : sql`(NULL)`}`);

    const usersMap = new Map(usersData.map(u => [u.id, u]));

    const enrichedBlocks = recentBlocks.map(block => ({
      ...block,
      blocker: usersMap.get(block.blockerId) || null,
      blocked: usersMap.get(block.blockedId) || null,
    }));

    // Get recent stream bans
    const recentStreamBans = await db
      .select({
        id: streamBans.id,
        streamId: streamBans.streamId,
        userId: streamBans.userId,
        bannedBy: streamBans.bannedBy,
        reason: streamBans.reason,
        createdAt: streamBans.createdAt,
      })
      .from(streamBans)
      .orderBy(desc(streamBans.createdAt))
      .limit(100);

    // Enrich stream bans with details
    const banUserIds = [...new Set([
      ...recentStreamBans.map(b => b.userId),
      ...recentStreamBans.map(b => b.bannedBy).filter(Boolean),
    ])];
    const streamIds = [...new Set(recentStreamBans.map(b => b.streamId))];

    const banUsersData = banUserIds.length > 0 ? await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(banUserIds.map(id => sql`${id}`), sql`, `)})`) : [];

    const streamsData = streamIds.length > 0 ? await db
      .select({
        id: streams.id,
        title: streams.title,
        creatorId: streams.creatorId,
      })
      .from(streams)
      .where(sql`${streams.id} IN (${sql.join(streamIds.map(id => sql`${id}`), sql`, `)})`) : [];

    const banUsersMap = new Map(banUsersData.map(u => [u.id, u]));
    const streamsMap = new Map(streamsData.map(s => [s.id, s]));

    const enrichedStreamBans = recentStreamBans.map(ban => ({
      ...ban,
      bannedUser: banUsersMap.get(ban.userId) || null,
      bannedByUser: ban.bannedBy ? banUsersMap.get(ban.bannedBy) || null : null,
      stream: streamsMap.get(ban.streamId) || null,
    }));

    // Get total counts
    const [blockCountResult] = await db
      .select({ count: count() })
      .from(userBlocks);

    const [banCountResult] = await db
      .select({ count: count() })
      .from(streamBans);

    return NextResponse.json({
      mostBlockedUsers,
      recentBlocks: enrichedBlocks,
      recentStreamBans: enrichedStreamBans,
      stats: {
        totalBlocks: blockCountResult?.count || 0,
        totalStreamBans: banCountResult?.count || 0,
        usersBlockedByMultiple: mostBlockedUsers.filter(u => Number(u.blockCount) > 1).length,
      },
    });
  } catch (error: any) {
    console.error('[ADMIN/MODERATION] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation data' },
      { status: 500 }
    );
  }
}
