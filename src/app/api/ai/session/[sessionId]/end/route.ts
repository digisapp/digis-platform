import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiSessionService } from '@/lib/services/ai-session-service';

export const runtime = 'nodejs';

/**
 * POST /api/ai/session/[sessionId]/end
 *
 * End an AI Twin voice chat session and process billing.
 *
 * Request body (optional):
 * - rating: number (1-5) - User rating for the session
 * - ratingComment: string - Optional feedback
 *
 * Returns:
 * - session: object - Updated session with duration and billing info
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

    // Parse optional body
    let rating: number | undefined;
    let ratingComment: string | undefined;

    try {
      const body = await request.json();
      rating = body.rating;
      ratingComment = body.ratingComment;

      // Validate rating if provided
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }
    } catch {
      // Body is optional, continue without it
    }

    // End the session
    const session = await AiSessionService.endSession(
      sessionId,
      user.id,
      rating,
      ratingComment
    );

    return NextResponse.json({
      session,
      message: 'Session ended successfully',
      duration: session.durationSeconds,
      charged: session.coinsSpent,
    });

  } catch (error: any) {
    console.error('[AI Session] End error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to end session' },
      { status: 400 }
    );
  }
}
