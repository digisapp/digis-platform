import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * GET /api/creator/setup
 * Get the current onboarding step and profile completion status
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: { profile: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
    }

    const settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, user.id),
    });

    return NextResponse.json({
      onboardingStep: dbUser.onboardingStep,
      onboardingCompletedAt: dbUser.onboardingCompletedAt,
      profile: {
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        bio: dbUser.bio,
        hasAvatar: !!dbUser.avatarUrl,
        hasBio: !!(dbUser.bio && dbUser.bio.trim().length > 0),
      },
      settings: settings ? {
        callRatePerMinute: settings.callRatePerMinute,
        voiceCallRatePerMinute: settings.voiceCallRatePerMinute,
        messageRate: settings.messageRate,
        isAvailableForCalls: settings.isAvailableForCalls,
        isAvailableForVoiceCalls: settings.isAvailableForVoiceCalls,
      } : null,
    });
  } catch (error) {
    console.error('[Creator Setup] GET error:', error);
    return NextResponse.json({ error: 'Failed to get setup status' }, { status: 500 });
  }
}

/**
 * POST /api/creator/setup
 * Update the onboarding step
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, 'creator:setup');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rl.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { step } = body;

    if (typeof step !== 'number' || step < 0 || step > 5) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Not a creator' }, { status: 403 });
    }

    // Only allow advancing forward (or completing)
    if (step <= dbUser.onboardingStep && step !== 5) {
      return NextResponse.json({ onboardingStep: dbUser.onboardingStep });
    }

    const updateData: Record<string, any> = {
      onboardingStep: step,
      updatedAt: new Date(),
    };

    // Mark as completed when reaching step 5
    if (step === 5) {
      updateData.onboardingCompletedAt = new Date();
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    return NextResponse.json({
      onboardingStep: step,
      ...(step === 5 ? { onboardingCompletedAt: updateData.onboardingCompletedAt } : {}),
    });
  } catch (error) {
    console.error('[Creator Setup] POST error:', error);
    return NextResponse.json({ error: 'Failed to update setup' }, { status: 500 });
  }
}
