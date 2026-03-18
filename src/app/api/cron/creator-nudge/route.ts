import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/db/schema';
import { eq, and, lt, gt, isNull } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/resend';
import { baseEmailTemplate } from '@/lib/email/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/creator-nudge
 * Send activation nudge emails to creators who haven't completed setup.
 *
 * Nudge schedule:
 * - 12 hours after signup: "Complete your profile" (step < 2)
 * - 24 hours after signup: "Set your rates & upload content" (step < 3)
 * - 48 hours after signup: "Your page is waiting — share your link" (step < 5)
 *
 * Should run every 6 hours via Vercel Cron.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const results = { nudge12h: 0, nudge24h: 0, nudge48h: 0, errors: 0 };

    // Find creators who need nudges (created in last 7 days, haven't completed onboarding)
    const incompleteCreators = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        displayName: users.displayName,
        onboardingStep: users.onboardingStep,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'creator'),
          isNull(users.onboardingCompletedAt),
          lt(users.onboardingStep, 5),
          gt(users.createdAt, sevenDaysAgo), // Only nudge creators from last 7 days
          lt(users.createdAt, twelveHoursAgo), // At least 12 hours old
        )
      )
      .limit(200);

    for (const creator of incompleteCreators) {
      const hoursSinceCreated = (now.getTime() - new Date(creator.createdAt).getTime()) / (1000 * 60 * 60);

      try {
        // 12-hour nudge: Profile photo (step < 2)
        if (
          hoursSinceCreated >= 12 &&
          hoursSinceCreated < 24 &&
          creator.onboardingStep < 2
        ) {
          await sendNudgeEmail(creator, '12h');
          results.nudge12h++;
        }
        // 24-hour nudge: Rates & content (step < 3)
        else if (
          hoursSinceCreated >= 24 &&
          hoursSinceCreated < 48 &&
          creator.onboardingStep < 3
        ) {
          await sendNudgeEmail(creator, '24h');
          results.nudge24h++;
        }
        // 48-hour nudge: Complete setup (step < 5)
        else if (
          hoursSinceCreated >= 48 &&
          hoursSinceCreated < 168 && // Up to 7 days
          creator.onboardingStep < 5
        ) {
          await sendNudgeEmail(creator, '48h');
          results.nudge48h++;
        }
      } catch (error) {
        console.error(`[Creator Nudge] Failed for ${creator.email}:`, error);
        results.errors++;
      }
    }

    console.log('[Creator Nudge] Results:', results);
    return NextResponse.json({
      success: true,
      ...results,
      totalProcessed: incompleteCreators.length,
    });
  } catch (error) {
    console.error('[Creator Nudge] Cron error:', error);
    return NextResponse.json({ error: 'Nudge cron failed' }, { status: 500 });
  }
}

interface NudgeCreator {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  onboardingStep: number;
  avatarUrl: string | null;
}

async function sendNudgeEmail(creator: NudgeCreator, stage: '12h' | '24h' | '48h') {
  const name = creator.displayName || creator.username || 'Creator';
  const setupUrl = `https://digis.cc/creator/setup`;

  const configs = {
    '12h': {
      subject: `${name}, your Digis profile is almost ready`,
      title: 'Complete Your Profile',
      emoji: '📸',
      body: `
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hey ${name}! You created your Digis account but haven't finished setting up yet.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Creators who add a profile photo and bio in their first day get <strong style="color: #00D4FF;">3x more profile views</strong>.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0;">
          It takes less than 2 minutes to finish.
        </p>
      `,
      ctaText: 'Complete Your Profile',
    },
    '24h': {
      subject: `${name}, set your rates and start earning on Digis`,
      title: 'Set Your Rates & Upload Content',
      emoji: '💰',
      body: `
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hey ${name}! Your Digis page is live but you haven't set your rates or uploaded content yet.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Fans are ready to connect — set your call rates and drop your first content so they can start supporting you.
        </p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
          Creators keep <strong style="color: #00D4FF;">70%</strong> of everything they earn.
        </p>
      `,
      ctaText: 'Set Up & Start Earning',
    },
    '48h': {
      subject: `${name}, your Digis page is waiting for fans`,
      title: 'Share Your Link & Get Fans',
      emoji: '🚀',
      body: `
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hey ${name}, your Digis page is set up but no fans have found it yet.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Share your link on Instagram, TikTok, or Twitter to start getting fans and earning coins.
        </p>
        <p style="color: #d1d5db; font-size: 16px; line-height: 1.6; margin: 0;">
          Your link: <strong style="color: #00D4FF;">digis.cc/${creator.username}</strong>
        </p>
      `,
      ctaText: 'Go to Your Dashboard',
    },
  };

  const config = configs[stage];

  const html = baseEmailTemplate({
    title: config.title,
    emoji: config.emoji,
    greeting: `Hey ${name}!`,
    body: config.body,
    ctaText: config.ctaText,
    ctaUrl: stage === '48h' ? `https://digis.cc/creator/dashboard` : setupUrl,
  });

  await sendEmail({
    to: creator.email,
    subject: config.subject,
    html,
  });

  console.log(`[Creator Nudge] Sent ${stage} nudge to ${creator.email}`);
}
