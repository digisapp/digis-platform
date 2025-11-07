import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shows = await ShowService.getCreatorShows(user.id);

    return NextResponse.json({
      success: true,
      shows,
    });
  } catch (error) {
    console.error('Error fetching creator shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shows' },
      { status: 500 }
    );
  }
}
