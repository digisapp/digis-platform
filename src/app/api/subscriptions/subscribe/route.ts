import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Subscribe to a creator
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { creatorId } = body;

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    // Can't subscribe to yourself
    if (creatorId === user.id) {
      return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 });
    }

    // Get creator's tier (single tier model)
    let tiers = await SubscriptionService.getCreatorTiers(creatorId);
    let tier = tiers[0];

    // Auto-create default subscription tier if creator hasn't set one up
    // Default price of 100 coins/month ensures creators earn from subscriptions
    if (!tier) {
      tier = await SubscriptionService.upsertSubscriptionTier(creatorId, {
        name: 'Subscriber',
        tier: 'basic',
        description: 'Get exclusive access to subscriber-only content',
        pricePerMonth: 100, // Default 100 coins/month
        benefits: ['Exclusive content', 'Subscriber badge', 'Direct messaging'],
      });
    }

    // Subscribe user to creator's tier
    const subscription = await SubscriptionService.subscribe(user.id, creatorId, tier.id);

    return NextResponse.json({
      success: true,
      subscription,
      message: `Successfully subscribed to ${tier.name}!`,
    });
  } catch (error) {
    console.error('Error subscribing:', error);
    const message = error instanceof Error ? error.message : 'Failed to subscribe';

    // Return user-friendly messages
    if (message.includes('Already subscribed')) {
      return NextResponse.json({ error: 'You are already subscribed to this creator.' }, { status: 400 });
    }
    if (message.includes('Not enough coins') || message.includes('Insufficient balance')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes('Wallet not found')) {
      return NextResponse.json({ error: 'Please try again or contact support.' }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
