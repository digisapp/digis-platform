import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { socialShareSubmissions, rewardConfig } from '@/db/schema/rewards';
import { users } from '@/db/schema/users';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/creator/share-rewards - Get creator's submissions and available rewards
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator's submissions
    const submissions = await db.query.socialShareSubmissions.findMany({
      where: eq(socialShareSubmissions.creatorId, user.id),
      orderBy: [desc(socialShareSubmissions.createdAt)],
    });

    // Get reward config
    const rewards = await db.query.rewardConfig.findMany({
      where: eq(rewardConfig.isActive, true),
    });

    // Check which rewards are already claimed
    const claimedPlatforms = submissions
      .filter(s => s.status === 'approved' || s.status === 'pending')
      .map(s => s.platform);

    const availableRewards = rewards.map(r => ({
      ...r,
      isClaimed: claimedPlatforms.includes(r.rewardType as any),
      isPending: submissions.some(s => s.platform === r.rewardType && s.status === 'pending'),
    }));

    return NextResponse.json({
      submissions,
      availableRewards,
      totalEarned: submissions
        .filter(s => s.status === 'approved')
        .reduce((sum, s) => sum + (s.coinsAwarded || 0), 0),
    });
  } catch (error: any) {
    console.error('Error fetching share rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share rewards' },
      { status: 500 }
    );
  }
}

// POST /api/creator/share-rewards - Submit a share proof
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform, screenshotUrl, socialHandle } = await request.json();

    // Validate platform
    const validPlatforms = ['instagram_story', 'instagram_bio', 'tiktok_bio'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    if (!screenshotUrl) {
      return NextResponse.json(
        { error: 'Screenshot is required' },
        { status: 400 }
      );
    }

    // Check if already submitted for this platform
    const existing = await db.query.socialShareSubmissions.findFirst({
      where: and(
        eq(socialShareSubmissions.creatorId, user.id),
        eq(socialShareSubmissions.platform, platform),
      ),
    });

    if (existing) {
      if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'You have already claimed this reward' },
          { status: 400 }
        );
      }
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending submission for this platform' },
          { status: 400 }
        );
      }
      // If rejected, allow resubmission by updating the existing record
      await db.update(socialShareSubmissions)
        .set({
          screenshotUrl,
          socialHandle,
          status: 'pending',
          rejectionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(socialShareSubmissions.id, existing.id));

      return NextResponse.json({
        success: true,
        message: 'Submission updated and pending review',
      });
    }

    // Create new submission
    const [submission] = await db.insert(socialShareSubmissions)
      .values({
        creatorId: user.id,
        platform,
        screenshotUrl,
        socialHandle,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({
      success: true,
      submission,
      message: 'Submission received! We\'ll review it within 24 hours.',
    });
  } catch (error: any) {
    console.error('Error submitting share proof:', error);
    return NextResponse.json(
      { error: 'Failed to submit share proof' },
      { status: 500 }
    );
  }
}
