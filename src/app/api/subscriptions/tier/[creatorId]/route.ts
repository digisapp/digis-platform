import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/services/subscription-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get a creator's subscription tier (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const tiers = await SubscriptionService.getCreatorTiers(creatorId);
    const tier = tiers[0] || null; // Single tier model

    return NextResponse.json({ tier });
  } catch (error) {
    console.error('Error fetching creator tier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription tier' },
      { status: 500 }
    );
  }
}
