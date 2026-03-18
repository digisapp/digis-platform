import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { fanReferrals, users, wallets } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reward amounts (coins)
const REFERRER_REWARD = 50;
const REFERRED_REWARD = 50;

/**
 * GET /api/referral/fan
 * Get the current user's referral code and stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create referral code
    let referral = await db.query.fanReferrals.findFirst({
      where: eq(fanReferrals.referrerId, user.id),
    });

    // If no code exists, generate one
    const code = `ref_${nanoid(8)}`;
    if (!referral) {
      [referral] = await db.insert(fanReferrals).values({
        referrerId: user.id,
        referralCode: code,
      }).returning();
    }

    // Get all referrals by this user
    const myReferrals = await db
      .select({
        id: fanReferrals.id,
        status: fanReferrals.status,
        referrerRewardPaid: fanReferrals.referrerRewardPaid,
        referredRewardPaid: fanReferrals.referredRewardPaid,
        createdAt: fanReferrals.createdAt,
        completedAt: fanReferrals.completedAt,
        referredUsername: users.username,
        referredDisplayName: users.displayName,
        referredAvatarUrl: users.avatarUrl,
      })
      .from(fanReferrals)
      .leftJoin(users, eq(fanReferrals.referredId, users.id))
      .where(eq(fanReferrals.referrerId, user.id));

    const completed = myReferrals.filter(r => r.status === 'completed').length;
    const pending = myReferrals.filter(r => r.status === 'pending').length;
    const totalEarned = completed * REFERRER_REWARD;

    return NextResponse.json({
      referralCode: referral.referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://digis.cc'}/signup?ref=${referral.referralCode}`,
      stats: {
        totalReferred: myReferrals.length,
        completed,
        pending,
        totalEarned,
      },
      referrals: myReferrals.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() || null,
      })),
      rewards: {
        referrerReward: REFERRER_REWARD,
        referredReward: REFERRED_REWARD,
      },
    });
  } catch (error) {
    console.error('[Fan Referral GET]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

/**
 * POST /api/referral/fan
 * Complete a referral (called during signup when ref code is present)
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, 'referral:complete');
    if (rateLimitResult) return rateLimitResult;

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Find the referral record
    const referral = await db.query.fanReferrals.findFirst({
      where: eq(fanReferrals.referralCode, referralCode),
    });

    if (!referral) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    // Can't refer yourself
    if (referral.referrerId === user.id) {
      return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
    }

    // Check if this user was already referred
    const existingReferral = await db.query.fanReferrals.findFirst({
      where: and(
        eq(fanReferrals.referredId, user.id),
        eq(fanReferrals.status, 'completed'),
      ),
    });

    if (existingReferral) {
      return NextResponse.json({ error: 'Already referred' }, { status: 400 });
    }

    // Complete the referral
    await db.update(fanReferrals)
      .set({
        referredId: user.id,
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(fanReferrals.id, referral.id));

    // Pay rewards to both users (add coins to wallets)
    // Referrer reward
    await db.execute(sql`
      UPDATE wallets SET balance = balance + ${REFERRER_REWARD}, updated_at = NOW()
      WHERE user_id = ${referral.referrerId}
    `);
    await db.update(fanReferrals)
      .set({ referrerRewardPaid: true })
      .where(eq(fanReferrals.id, referral.id));

    // Referred user reward
    await db.execute(sql`
      UPDATE wallets SET balance = balance + ${REFERRED_REWARD}, updated_at = NOW()
      WHERE user_id = ${user.id}
    `);
    await db.update(fanReferrals)
      .set({ referredRewardPaid: true })
      .where(eq(fanReferrals.id, referral.id));

    // Create a new referral code for the referrer (so they can refer more people)
    const newCode = `ref_${nanoid(8)}`;
    await db.insert(fanReferrals).values({
      referrerId: referral.referrerId,
      referralCode: newCode,
    }).onConflictDoNothing();

    return NextResponse.json({
      success: true,
      reward: REFERRED_REWARD,
      message: `You received ${REFERRED_REWARD} coins!`,
    });
  } catch (error) {
    console.error('[Fan Referral POST]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
