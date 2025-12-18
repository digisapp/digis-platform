import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiSessionService } from '@/lib/services/ai-session-service';

export const runtime = 'nodejs';

/**
 * POST /api/ai/session/[sessionId]/tick
 *
 * Process a billing tick for an active AI session.
 * Should be called every minute by the client to charge incrementally.
 *
 * Returns:
 * - success: whether billing succeeded
 * - shouldContinue: whether session can continue (has balance)
 * - remainingBalance: fan's remaining balance
 * - minutesRemaining: estimated minutes left based on balance
 * - totalCharged: total coins charged this session
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process the billing tick
    const result = await AiSessionService.tickSession(sessionId, user.id);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[AI Session] Tick error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process billing tick' },
      { status: 500 }
    );
  }
}
