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
    const { creatorId, voice = 'ara', forceCleanup = false } = body;

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
      // Check if the existing session is stuck (older than 30 minutes) or forceCleanup is requested
      const sessionAgeMs = Date.now() - new Date(existingSession.startedAt).getTime();
      const maxSessionAgeMs = 30 * 60 * 1000; // 30 minutes

      if (sessionAgeMs > maxSessionAgeMs || forceCleanup) {
        // Auto-cleanup stuck session or force cleanup requested
        console.log('[AI Session] Cleaning up session:', existingSession.id,
          forceCleanup ? '(force cleanup)' : `(stuck, age: ${Math.floor(sessionAgeMs / 60000)} minutes)`);

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
