import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, follows } from '@/db/schema';
import { eq, and, lt, gt, sql } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/resend';
import { baseEmailTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/fan-nudge
 * Send activation emails to fans who haven't followed anyone yet.
 *
 * Nudge schedule (non-overlapping windows):
 * - 12h after signup: "Discover creators you'll love"
 * - 36h after signup: "You haven't followed anyone yet"
 * - 72h after signup: "Don't miss out — creators are going live"
 *
 * Runs every 6 hours via Vercel Cron.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const results = { nudge12h: 0, nudge36h: 0, nudge72h: 0, errors: 0 };

    // Find fans who signed up in the last 7 days and have NOT followed anyone
    const inactiveFans = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'fan'),
          eq(users.accountStatus, 'active'),
          gt(users.createdAt, sevenDaysAgo),
          lt(users.createdAt, twelveHoursAgo),
          // No follows yet
          sql`${users.id} NOT IN (SELECT follower_id FROM follows)`,
        )
      )
      .limit(200);

    for (const fan of inactiveFans) {
      const hoursSinceCreated = (now.getTime() - new Date(fan.createdAt).getTime()) / (1000 * 60 * 60);

      try {
        if (hoursSinceCreated >= 12 && hoursSinceCreated < 24) {
          await sendFanNudge(fan, '12h');
          results.nudge12h++;
        } else if (hoursSinceCreated >= 36 && hoursSinceCreated < 48) {
          await sendFanNudge(fan, '36h');
          results.nudge36h++;
        } else if (hoursSinceCreated >= 72 && hoursSinceCreated < 96) {
          await sendFanNudge(fan, '72h');
          results.nudge72h++;
        }
      } catch (error) {
        console.error(`[Fan Nudge] Failed for ${fan.email}:`, error);
        results.errors++;
      }
    }

    console.log('[Fan Nudge] Results:', results);
    return NextResponse.json({
      success: true,
      ...results,
      totalProcessed: inactiveFans.length,
    });
  } catch (error) {
    console.error('[Fan Nudge] Cron error:', error);
    return NextResponse.json({ error: 'Fan nudge cron failed' }, { status: 500 });
  }
}

interface NudgeFan {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
}

async function sendFanNudge(fan: NudgeFan, stage: '12h' | '36h' | '72h') {
  const name = fan.displayName || fan.username || 'there';
  const exploreUrl = 'https://digis.cc/explore';
  const forYouUrl = 'https://digis.cc/for-you';

  const configs = {
    '12h': {
      subject: `${name}, discover creators you'll love on Digis`,
      title: 'Discover Creators',
      emoji: '🔍',
      body: `
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hey ${name}! Welcome to Digis. There are creators waiting to connect with you.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Follow your favorite creators to see their live streams, exclusive content, and updates in your feed.
        </p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
          You also have <strong style="color: #00D4FF;">free coins</strong> waiting in your wallet to send your first tip.
        </p>
      `,
      ctaText: 'Explore Creators',
      ctaUrl: exploreUrl,
    },
    '36h': {
      subject: `${name}, you haven't followed anyone on Digis yet`,
      title: 'Your Feed Is Empty',
      emoji: '📱',
      body: `
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hey ${name}! Your Digis feed is looking empty — follow some creators to fill it with content.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Creators are posting photos, videos, going live, and offering exclusive 1-on-1 calls. Don't miss out!
        </p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
          Browse the For You feed to discover trending content.
        </p>
      `,
      ctaText: 'Browse For You',
      ctaUrl: forYouUrl,
    },
    '72h': {
      subject: `Creators are going live on Digis — don't miss out, ${name}`,
      title: "You're Missing Out",
      emoji: '🔴',
      body: `
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hey ${name}! Creators on Digis are going live, posting exclusive content, and connecting with fans every day.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Follow creators you like and you'll get notified when they go live or drop new content.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0;">
          This is your last reminder — we won't bother you again.
        </p>
      `,
      ctaText: 'Explore Now',
      ctaUrl: exploreUrl,
    },
  };

  const config = configs[stage];

  const html = baseEmailTemplate({
    title: config.title,
    emoji: config.emoji,
    greeting: `Hey ${name}!`,
    body: config.body,
    ctaText: config.ctaText,
    ctaUrl: config.ctaUrl,
  });

  await sendEmail({
    to: fan.email,
    subject: config.subject,
    html,
  });
}
