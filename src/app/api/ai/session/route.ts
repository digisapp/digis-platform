import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiSessionService } from '@/lib/services/ai-session-service';

export const runtime = 'nodejs';

/**
 * POST /api/ai/session
 *
 * Start a new AI Twin voice chat session.
 * Creates a session record and places a hold for minimum duration.
 *
 * Request body:
 * - creatorId: string - The creator whose AI Twin to chat with
 * - voice: 'ara' | 'eve' | 'leo' | 'rex' | 'sal' - Voice to use
 *
 * Returns:
 * - session: object - The created session record
 * - settings: object - Session settings (prices, limits, welcome message)
 * - holdId: string - The hold ID for tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { creatorId, voice = 'ara' } = body;

    if (!creatorId) {
      return NextResponse.json(
        { error: 'creatorId is required' },
        { status: 400 }
      );
    }

    // Validate voice option
    const validVoices = ['ara', 'eve', 'leo', 'rex', 'sal'];
    if (!validVoices.includes(voice)) {
      return NextResponse.json(
        { error: 'Invalid voice option' },
        { status: 400 }
      );
    }

    // Check if user already has an active session
    const existingSession = await AiSessionService.getActiveSession(user.id);
    if (existingSession) {
      return NextResponse.json(
        {
          error: 'You already have an active session',
          sessionId: existingSession.id,
        },
        { status: 409 }
      );
    }

    // Start session
    const result = await AiSessionService.startSession(
      user.id,
      creatorId,
      voice as 'ara' | 'eve' | 'leo' | 'rex' | 'sal'
    );

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[AI Session] Start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start session' },
      { status: error.message?.includes('Insufficient') ? 402 : 500 }
    );
  }
}

/**
 * GET /api/ai/session
 *
 * Get the current user's active AI session if any
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSession = await AiSessionService.getActiveSession(user.id);

    return NextResponse.json({ session: activeSession || null });

  } catch (error) {
    console.error('[AI Session] Get active error:', error);
    return NextResponse.json(
      { error: 'Failed to get active session' },
      { status: 500 }
    );
  }
}
