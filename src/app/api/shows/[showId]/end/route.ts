import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const stats = await ShowService.endShow(showId, user.id);

    return NextResponse.json({
      success: true,
      stats,
      message: 'Show ended successfully!',
    });
  } catch (error) {
    console.error('Error ending show:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end show' },
      { status: 500 }
    );
  }
}
