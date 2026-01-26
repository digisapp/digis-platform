import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { invalidateSubscriptionTiers } from '@/lib/cache/hot-data-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get creator's subscription tier settings
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator's tier (single tier per creator)
    const tiers = await SubscriptionService.getCreatorTiers(user.id);
    const tier = tiers[0] || null; // Get first/only tier

    return NextResponse.json({ tier });
  } catch (error) {
    console.error('Error fetching subscription settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription settings' },
      { status: 500 }
    );
  }
}

// POST - Create or update subscription tier
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, pricePerMonth, benefits, isActive } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Subscription name is required' }, { status: 400 });
    }

    if (!pricePerMonth || pricePerMonth < 1) {
      return NextResponse.json({ error: 'Price must be at least 1 coin' }, { status: 400 });
    }

    // Create or update tier (always use 'basic' tier for single-tier model)
    const tier = await SubscriptionService.upsertSubscriptionTier(user.id, {
      name: name.trim(),
      tier: 'basic',
      description: description?.trim() || undefined,
      pricePerMonth: parseInt(pricePerMonth),
      benefits: benefits || [],
    });

    // Update isActive if provided
    if (typeof isActive === 'boolean') {
      const { db, subscriptionTiers } = await import('@/lib/data/system');
      const { eq } = await import('drizzle-orm');

      await db
        .update(subscriptionTiers)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(subscriptionTiers.id, tier.id));
    }

    // Invalidate cached tiers so changes are immediately visible to fans
    await invalidateSubscriptionTiers(user.id);

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error('Error saving subscription settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}
