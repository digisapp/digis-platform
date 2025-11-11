import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Cancel a subscription
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await SubscriptionService.cancelSubscription(user.id, subscriptionId);

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
