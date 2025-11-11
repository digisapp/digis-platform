import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Toggle auto-renew for a subscription
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

    const body = await req.json();
    const { autoRenew } = body;

    if (typeof autoRenew !== 'boolean') {
      return NextResponse.json({ error: 'autoRenew must be a boolean' }, { status: 400 });
    }

    const subscription = await SubscriptionService.toggleAutoRenew(user.id, subscriptionId, autoRenew);

    return NextResponse.json({
      success: true,
      subscription,
      message: autoRenew ? 'Auto-renewal enabled' : 'Auto-renewal disabled',
    });
  } catch (error) {
    console.error('Error toggling auto-renew:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle auto-renew' },
      { status: 500 }
    );
  }
}
