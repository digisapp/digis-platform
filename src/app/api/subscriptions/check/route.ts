import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Check if user is subscribed to a creator
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json({ error: 'Creator ID is required' }, { status: 400 });
    }

    const subscription = await SubscriptionService.getUserSubscription(user.id, creatorId);
    const isSubscribed = !!subscription;

    // Debug logging for subscription check
    console.log(`[Subscription Check] User ${user.id} -> Creator ${creatorId}: isSubscribed=${isSubscribed}`);

    return NextResponse.json({
      isSubscribed,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}
