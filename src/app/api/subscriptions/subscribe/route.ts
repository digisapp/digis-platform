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
    const tiers = await SubscriptionService.getCreatorTiers(creatorId);
    const tier = tiers[0];

    if (!tier) {
      return NextResponse.json({ error: 'Creator has not set up subscriptions' }, { status: 404 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
