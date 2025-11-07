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
    const body = await request.json();
    const remindBeforeMinutes = body.remindBeforeMinutes || 15;

    const reminder = await ShowService.setReminder(user.id, showId, remindBeforeMinutes);

    return NextResponse.json({
      success: true,
      reminder,
      message: `Reminder set for ${remindBeforeMinutes} minutes before show`,
    });
  } catch (error) {
    console.error('Error setting reminder:', error);
    return NextResponse.json(
      { error: 'Failed to set reminder' },
      { status: 500 }
    );
  }
}
