import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get user's subscriptions
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await SubscriptionService.getUserSubscriptions(user.id);

    // Parse benefits JSON for each subscription
    const parsedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      tier: {
        ...sub.tier,
        benefits: sub.tier.benefits ? JSON.parse(sub.tier.benefits) : [],
      },
    }));

    return NextResponse.json({ subscriptions: parsedSubscriptions });
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
