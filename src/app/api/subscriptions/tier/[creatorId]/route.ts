import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { getCachedSubscriptionTiers } from '@/lib/cache/hot-data-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Get a creator's subscription tier (public)
 *
 * Cached for 10 minutes via Redis (creators don't change pricing often)
 * Cache is invalidated when creator updates their tier
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    // Use Redis cache for subscription tiers
    const tiers = await getCachedSubscriptionTiers(
      creatorId,
      () => SubscriptionService.getCreatorTiers(creatorId)
    );
    const tier = tiers[0] || null; // Single tier model

    return NextResponse.json(
      { tier },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching creator tier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription tier' },
      { status: 500 }
    );
  }
}
