import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { db } from '@/lib/data/system';
import { subscriptions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // DEBUG: Query ALL subscriptions for this user/creator pair to see what exists
    const allSubs = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.userId, user.id),
        eq(subscriptions.creatorId, creatorId)
      ),
    });

    console.log(`[Subscription Check DEBUG] All subscriptions for user ${user.id} -> creator ${creatorId}:`,
      allSubs.map(s => ({
        id: s.id,
        status: s.status,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        now: new Date().toISOString()
      }))
    );

    const subscription = await SubscriptionService.getUserSubscription(user.id, creatorId);
    const isSubscribed = !!subscription;

    // Debug logging for subscription check
    console.log(`[Subscription Check] User ${user.id} -> Creator ${creatorId}: isSubscribed=${isSubscribed}, subscription found:`, subscription ? { id: subscription.id, status: subscription.status, expiresAt: subscription.expiresAt } : null);

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
