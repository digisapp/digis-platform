import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiSessionService } from '@/lib/services/ai-session-service';
import { db } from '@/lib/data/system';
import { aiSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * POST /api/ai/session
 *
 * Start a new AI Twin voice chat session.
 * Creates a session record and places a hold for minimum duration.
 *
 * Request body:
 * - creatorId: string - The creator whose AI Twin to chat with
 * - voice: 'ara' | 'eve' | 'mika' | 'leo' | 'rex' | 'sal' - Voice to use
 *
 * Returns:
 * - session: object - The created session record
 * - settings: object - Session settings (prices, limits, welcome message)
 * - holdId: string - The hold ID for tracking
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[AI Session] POST request started');

  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[AI Session] Auth error:', authError.message);
      return NextResponse.json({ error: 'Authentication failed', code: 'AUTH_ERROR' }, { status: 401 });
    }

    if (!user) {
      console.log('[AI Session] No authenticated user');
      return NextResponse.json({ error: 'Please sign in to use AI Twin', code: 'NOT_AUTHENTICATED' }, { status: 401 });
    }

    console.log('[AI Session] User authenticated:', user.id);

    // Parse request
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[AI Session] Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body', code: 'INVALID_REQUEST' }, { status: 400 });
    }

    const { creatorId, voice = 'ara', forceCleanup = false } = body;
    console.log('[AI Session] Request params:', { creatorId, voice, forceCleanup });

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required', code: 'MISSING_CREATOR_ID' },
        { status: 400 }
      );
    }

    // Validate voice option
    const validVoices = ['ara', 'eve', 'mika', 'leo', 'rex', 'sal'];
    if (!validVoices.includes(voice)) {
      console.log('[AI Session] Invalid voice option:', voice);
      return NextResponse.json(
        { error: 'Invalid voice option', code: 'INVALID_VOICE', validVoices },
        { status: 400 }
      );
    }

    // Check if user already has an active session
    console.log('[AI Session] Checking for existing active session...');
    const existingSession = await AiSessionService.getActiveSession(user.id);
    if (existingSession) {
      // Check if the existing session is stuck (older than 30 minutes) or forceCleanup is requested
      const sessionAgeMs = Date.now() - new Date(existingSession.startedAt).getTime();
      const maxSessionAgeMs = 30 * 60 * 1000; // 30 minutes
      const sessionAgeMinutes = Math.floor(sessionAgeMs / 60000);

      console.log('[AI Session] Found existing session:', {
        id: existingSession.id,
        ageMinutes: sessionAgeMinutes,
        creatorId: existingSession.creatorId,
        forceCleanup,
      });

      if (sessionAgeMs > maxSessionAgeMs || forceCleanup) {
        // Auto-cleanup stuck session or force cleanup requested
        console.log('[AI Session] Cleaning up session:', existingSession.id,
          forceCleanup ? '(force cleanup requested)' : `(stuck, age: ${sessionAgeMinutes} minutes)`);

        // Try to clean up the session - use direct DB update for reliability
        try {
          // Direct database update - more reliable than going through service
          const updateResult = await db
            .update(aiSessions)
            .set({
              status: 'failed',
              endedAt: new Date(),
              errorMessage: forceCleanup ? 'Session force-cleaned by user' : 'Session auto-cleaned due to inactivity',
              updatedAt: new Date(),
            })
            .where(eq(aiSessions.id, existingSession.id))
            .returning({ id: aiSessions.id, status: aiSessions.status });

          console.log('[AI Session] Cleanup update result:', updateResult);

          // Verify cleanup worked
          const stillExists = await AiSessionService.getActiveSession(user.id);
          if (stillExists) {
            console.error('[AI Session] Session still active after cleanup:', {
              sessionId: stillExists.id,
              status: stillExists.status,
              startedAt: stillExists.startedAt,
            });
            return NextResponse.json(
              {
                error: 'Failed to cleanup existing session. Please try again.',
                sessionId: stillExists.id,
              },
              { status: 409 }
            );
          }

          console.log('[AI Session] Session cleaned up successfully:', existingSession.id);
        } catch (cleanupError) {
          console.error('[AI Session] Failed to cleanup session:', cleanupError);
          return NextResponse.json(
            {
              error: 'Failed to cleanup existing session',
              sessionId: existingSession.id,
            },
            { status: 409 }
          );
        }
        // Continue to create new session below
      } else {
        // Session is recent, return 409 so client can attempt cleanup
        return NextResponse.json(
          {
            error: 'You already have an active session',
            sessionId: existingSession.id,
          },
          { status: 409 }
        );
      }
    }

    // Start session
    console.log('[AI Session] Starting new session for creator:', creatorId);
    try {
      const result = await AiSessionService.startSession(
        user.id,
        creatorId,
        voice as 'ara' | 'eve' | 'mika' | 'leo' | 'rex' | 'sal'
      );

      const elapsed = Date.now() - startTime;
      console.log('[AI Session] Session started successfully in', elapsed, 'ms:', {
        sessionId: result.session.id,
        holdId: result.holdId,
      });

      return NextResponse.json(result);
    } catch (sessionError: any) {
      const elapsed = Date.now() - startTime;
      console.error('[AI Session] Session start error after', elapsed, 'ms:', {
        message: sessionError.message,
        stack: sessionError.stack,
        userId: user.id,
        creatorId,
      });

      // Map specific errors to appropriate codes
      if (sessionError.message?.includes('Insufficient balance')) {
        return NextResponse.json(
          { error: sessionError.message, code: 'INSUFFICIENT_BALANCE' },
          { status: 402 }
        );
      }
      if (sessionError.message?.includes('not available')) {
        return NextResponse.json(
          { error: 'AI Twin is not available for this creator', code: 'AI_NOT_AVAILABLE' },
          { status: 404 }
        );
      }
      if (sessionError.message?.includes('Wallet')) {
        return NextResponse.json(
          { error: 'Unable to process payment. Please try again.', code: 'WALLET_ERROR' },
          { status: 500 }
        );
      }

      throw sessionError; // Re-throw for general error handler
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('[AI Session] Start error after', elapsed, 'ms:', {
      message: error.message,
      stack: error.stack,
    });

    // Determine appropriate error code and status
    let code = 'SESSION_START_FAILED';
    let status = 500;

    if (error.message?.includes('Insufficient')) {
      code = 'INSUFFICIENT_BALANCE';
      status = 402;
    } else if (error.message?.includes('not available')) {
      code = 'AI_NOT_AVAILABLE';
      status = 404;
    }

    return NextResponse.json(
      { error: error.message || 'Failed to start session', code },
      { status }
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
