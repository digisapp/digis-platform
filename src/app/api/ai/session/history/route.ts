import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiSessionService } from '@/lib/services/ai-session-service';

export const runtime = 'nodejs';

/**
 * GET /api/ai/session/history
 *
 * Get the user's AI session history (as fan or creator)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await AiSessionService.getSessionHistory(user.id);

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('[AI Session] History error:', error);
    return NextResponse.json(
      { error: 'Failed to get session history' },
      { status: 500 }
    );
  }
}
