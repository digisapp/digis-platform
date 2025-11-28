import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clean up expired calls before fetching (async, fire and forget)
    CallService.cleanupExpiredCalls().catch(err => {
      console.error('[Pending calls] Cleanup error:', err);
    });

    const pendingCalls = await CallService.getPendingRequests(user.id);

    // Add timeout info to each call
    const callsWithTimeout = pendingCalls.map(call => {
      const requestedAt = new Date(call.requestedAt);
      const expiresAt = new Date(requestedAt.getTime() + 5 * 60 * 1000); // 5 minutes
      const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

      return {
        ...call,
        expiresAt: expiresAt.toISOString(),
        remainingSeconds,
      };
    });

    return NextResponse.json({ calls: callsWithTimeout });
  } catch (error: any) {
    console.error('Error fetching pending calls:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending calls' },
      { status: 500 }
    );
  }
}
