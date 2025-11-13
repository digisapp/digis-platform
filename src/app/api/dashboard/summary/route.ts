/**
 * Combined dashboard summary endpoint
 * Fetches all dashboard data in parallel on the server
 * Reduces 6+ client requests to 1
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, wallets, streams, calls, shows, walletTransactions } from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';
import { withTimeoutAndRetry } from '@/lib/async-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data in parallel on the server
    const [
      profile,
      walletData,
      analyticsData,
      recentCallsData,
      recentStreamsData,
      upcomingShowsData,
      pendingCallsData,
    ] = await Promise.allSettled([
      // Profile
      withTimeoutAndRetry(
        () =>
          db.query.users.findFirst({
            where: eq(users.id, user.id),
            columns: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              role: true,
              isCreatorVerified: true,
            },
          }),
        { timeoutMs: 2500, retries: 1 }
      ),

      // Wallet balance
      withTimeoutAndRetry(
        () =>
          db.query.wallets.findFirst({
            where: eq(wallets.userId, user.id),
            columns: {
              balance: true,
            },
          }),
        { timeoutMs: 2500, retries: 1 }
      ),

      // Analytics (simplified for speed)
      withTimeoutAndRetry(
        async () => {
          const [followerCount, totalEarnings] = await Promise.all([
            db
              .select({ count: sql<number>`count(*)` })
              .from(users)
              .where(eq(users.id, user.id))
              .then((r) => r[0]?.count ?? 0),
            db
              .select({ total: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)` })
              .from(walletTransactions)
              .where(
                and(
                  eq(walletTransactions.userId, user.id),
                  sql`${walletTransactions.amount} > 0`
                )
              )
              .then((r) => r[0]?.total ?? 0),
          ]);

          return {
            followerCount,
            totalEarnings,
          };
        },
        { timeoutMs: 3000, retries: 0 }
      ),

      // Recent calls
      withTimeoutAndRetry(
        () =>
          db.query.calls.findMany({
            where: and(eq(calls.creatorId, user.id), eq(calls.status, 'completed')),
            orderBy: [desc(calls.createdAt)],
            limit: 5,
            with: {
              fan: {
                columns: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          }),
        { timeoutMs: 2500, retries: 1 }
      ),

      // Recent streams
      withTimeoutAndRetry(
        () =>
          db.query.streams.findMany({
            where: eq(streams.creatorId, user.id),
            orderBy: [desc(streams.createdAt)],
            limit: 5,
            columns: {
              id: true,
              title: true,
              createdAt: true,
              status: true,
              currentViewers: true,
              peakViewers: true,
            },
          }),
        { timeoutMs: 2500, retries: 1 }
      ),

      // Upcoming shows
      withTimeoutAndRetry(
        () =>
          db.query.shows.findMany({
            where: eq(shows.creatorId, user.id),
            orderBy: [desc(shows.scheduledFor)],
            limit: 10,
            columns: {
              id: true,
              title: true,
              description: true,
              scheduledFor: true,
              ticketPrice: true,
            },
          }),
        { timeoutMs: 2500, retries: 1 }
      ),

      // Pending calls
      withTimeoutAndRetry(
        () =>
          db.query.calls.findMany({
            where: and(eq(calls.creatorId, user.id), eq(calls.status, 'pending')),
            orderBy: [desc(calls.requestedAt)],
            limit: 20,
            with: {
              fan: {
                columns: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          }),
        { timeoutMs: 2500, retries: 1 }
      ),
    ]);

    // Extract values, handle failures gracefully
    const data = {
      profile: profile.status === 'fulfilled' ? profile.value : null,
      balance: walletData.status === 'fulfilled' ? walletData.value?.balance ?? 0 : 0,
      analytics: analyticsData.status === 'fulfilled' ? analyticsData.value : null,
      recentCalls: recentCallsData.status === 'fulfilled' ? recentCallsData.value : [],
      recentStreams: recentStreamsData.status === 'fulfilled' ? recentStreamsData.value : [],
      upcomingShows: upcomingShowsData.status === 'fulfilled' ? upcomingShowsData.value : [],
      pendingCalls: pendingCallsData.status === 'fulfilled' ? pendingCallsData.value : [],
    };

    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error: any) {
    console.error('[DashboardSummary] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
