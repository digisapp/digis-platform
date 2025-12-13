import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/shows/[showId]/attendees
 * Returns list of users who purchased tickets for the show
 * Only accessible by the show creator
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { showId } = await params;

    // getAttendees verifies the user is the creator
    const attendees = await ShowService.getAttendees(showId, user.id);

    return NextResponse.json({
      success: true,
      attendees,
      count: attendees.length,
    });
  } catch (error) {
    console.error('Error fetching attendees:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}
