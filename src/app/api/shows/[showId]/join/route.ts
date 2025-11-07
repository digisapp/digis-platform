import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';

export async function POST(
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

    // Verify access and check in
    const access = await ShowService.verifyAccess(user.id, showId);

    return NextResponse.json({
      success: true,
      roomName: access.roomName,
      showTitle: access.showTitle,
      message: 'Access granted! Joining show...',
    });
  } catch (error) {
    console.error('Error joining show:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join show' },
      { status: 500 }
    );
  }
}
