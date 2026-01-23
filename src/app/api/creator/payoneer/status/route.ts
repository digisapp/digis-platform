import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayoneerStatus, isPayoneerConfigured } from '@/lib/payoneer/service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/creator/payoneer/status
 *
 * Get the current Payoneer status for the authenticated creator
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Payoneer is configured
    const configured = isPayoneerConfigured();

    // Check for force sync query param
    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('sync') === 'true';

    // Get Payoneer status
    const status = await getPayoneerStatus(user.id, forceSync);

    return NextResponse.json({
      configured,
      status: status.status,
      payeeId: status.payeeId,
      preferredCurrency: status.preferredCurrency,
      lastSyncedAt: status.lastSyncedAt?.toISOString(),
      isActive: status.status === 'active',
      canRequestPayout: status.status === 'active',
    });
  } catch (error) {
    console.error('Error fetching Payoneer status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Payoneer status' },
      { status: 500 }
    );
  }
}
