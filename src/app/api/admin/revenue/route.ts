import { NextResponse } from 'next/server';
import { db, walletTransactions, users, wallets } from '@/lib/data/system';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { withAdmin } from '@/lib/auth/withAdmin';

// GET /api/admin/revenue - Get revenue stats and creator leaderboard
export const GET = withAdmin(async () => {
  try {
    // Get time ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel
    const [
      totalCoinsPurchased,
      todayCoinsPurchased,
      weekCoinsPurchased,
      monthCoinsPurchased,
      totalTips,
      topEarners,
      topFollowed,
      mostActiveStreamers,
      topPurchasers,
    ] = await Promise.all([
      // Total coins purchased (all time)
      db.select({
        total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)::int`,
      })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.type, 'purchase'),
          eq(walletTransactions.status, 'completed')
        )),

      // Today's coins purchased
      db.select({
        total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)::int`,
      })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.type, 'purchase'),
          eq(walletTransactions.status, 'completed'),
          gte(walletTransactions.createdAt, today)
        )),

      // This week's coins purchased
      db.select({
        total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)::int`,
      })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.type, 'purchase'),
          eq(walletTransactions.status, 'completed'),
          gte(walletTransactions.createdAt, thisWeek)
        )),

      // This month's coins purchased
      db.select({
        total: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)::int`,
      })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.type, 'purchase'),
          eq(walletTransactions.status, 'completed'),
          gte(walletTransactions.createdAt, thisMonth)
        )),

      // Total tips/gifts sent (stream_tip, dm_tip, gift types)
      db.select({
        total: sql<number>`COALESCE(SUM(ABS(${walletTransactions.amount})), 0)::int`,
      })
        .from(walletTransactions)
        .where(and(
          sql`${walletTransactions.type} IN ('stream_tip', 'dm_tip', 'gift')`,
          eq(walletTransactions.status, 'completed'),
          sql`${walletTransactions.amount} < 0` // Outgoing transactions (tips sent)
        )),

      // Top earners (creators with highest lifetime earnings from tips/gifts/messages)
      db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isCreatorVerified: users.isCreatorVerified,
        lifetimeEarnings: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.amount} > 0 AND ${walletTransactions.type} IN ('stream_tip', 'dm_tip', 'gift', 'message_payment', 'subscription') AND ${walletTransactions.status} = 'completed' THEN ${walletTransactions.amount} ELSE 0 END), 0)::int`,
        balance: wallets.balance,
        followerCount: users.followerCount,
      })
        .from(users)
        .leftJoin(wallets, eq(users.id, wallets.userId))
        .leftJoin(walletTransactions, eq(users.id, walletTransactions.userId))
        .where(eq(users.role, 'creator'))
        .groupBy(users.id, users.username, users.displayName, users.avatarUrl, users.isCreatorVerified, users.followerCount, wallets.balance)
        .orderBy(desc(sql`COALESCE(SUM(CASE WHEN ${walletTransactions.amount} > 0 AND ${walletTransactions.type} IN ('stream_tip', 'dm_tip', 'gift', 'message_payment', 'subscription') AND ${walletTransactions.status} = 'completed' THEN ${walletTransactions.amount} ELSE 0 END), 0)`))
        .limit(10),

      // Most followed creators
      db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isCreatorVerified: users.isCreatorVerified,
        followerCount: users.followerCount,
      })
        .from(users)
        .where(eq(users.role, 'creator'))
        .orderBy(desc(users.followerCount))
        .limit(10),

      // Most active streamers (by recent streams) - using lastSeenAt as a proxy
      db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isCreatorVerified: users.isCreatorVerified,
        lastSeenAt: users.lastSeenAt,
        followerCount: users.followerCount,
      })
        .from(users)
        .where(and(
          eq(users.role, 'creator'),
          sql`${users.lastSeenAt} IS NOT NULL`
        ))
        .orderBy(desc(users.lastSeenAt))
        .limit(10),

      // Top purchasers (fans who buy the most coins)
      db.select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        email: users.email,
        totalPurchased: sql<number>`COALESCE(SUM(${walletTransactions.amount}), 0)::int`,
        purchaseCount: sql<number>`COUNT(*)::int`,
      })
        .from(walletTransactions)
        .innerJoin(users, eq(walletTransactions.userId, users.id))
        .where(and(
          eq(walletTransactions.type, 'purchase'),
          eq(walletTransactions.status, 'completed')
        ))
        .groupBy(users.id, users.username, users.displayName, users.avatarUrl, users.email)
        .orderBy(desc(sql`COALESCE(SUM(${walletTransactions.amount}), 0)`))
        .limit(10),
    ]);

    // Calculate platform revenue (assuming ~40% margin on average)
    // 1 coin = ~$0.15 average purchase price, creator gets $0.10 = ~33% margin
    const AVERAGE_COIN_PRICE = 0.15; // $0.15 per coin average
    const CREATOR_PAYOUT_RATE = 0.10; // $0.10 per coin to creator
    const PLATFORM_MARGIN = AVERAGE_COIN_PRICE - CREATOR_PAYOUT_RATE;

    const totalCoins = totalCoinsPurchased[0]?.total || 0;
    const todayCoins = todayCoinsPurchased[0]?.total || 0;
    const weekCoins = weekCoinsPurchased[0]?.total || 0;
    const monthCoins = monthCoinsPurchased[0]?.total || 0;
    const tipsTotal = totalTips[0]?.total || 0;

    return NextResponse.json({
      revenue: {
        totalCoinsSold: totalCoins,
        todayCoinsSold: todayCoins,
        weekCoinsSold: weekCoins,
        monthCoinsSold: monthCoins,
        totalTips: tipsTotal,
        // Revenue estimates
        totalRevenue: Math.round(totalCoins * AVERAGE_COIN_PRICE * 100) / 100,
        todayRevenue: Math.round(todayCoins * AVERAGE_COIN_PRICE * 100) / 100,
        weekRevenue: Math.round(weekCoins * AVERAGE_COIN_PRICE * 100) / 100,
        monthRevenue: Math.round(monthCoins * AVERAGE_COIN_PRICE * 100) / 100,
        platformProfit: Math.round(totalCoins * PLATFORM_MARGIN * 100) / 100,
      },
      leaderboard: {
        topEarners: topEarners.map(c => ({
          ...c,
          earnings: c.lifetimeEarnings || 0,
          currentBalance: c.balance || 0,
        })),
        topFollowed,
        mostActive: mostActiveStreamers,
        topPurchasers: topPurchasers.map(p => ({
          id: p.id,
          username: p.username,
          displayName: p.displayName,
          avatarUrl: p.avatarUrl,
          email: p.email,
          totalPurchased: p.totalPurchased || 0,
          purchaseCount: p.purchaseCount || 0,
        })),
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
});
