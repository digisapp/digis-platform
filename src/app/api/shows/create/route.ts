import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a creator
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can create shows' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      showType = 'live_show', // Default to live_show (will be replaced with categories later)
      ticketPrice,
      maxTickets,
      scheduledStart,
      scheduledEnd,
      durationMinutes,
      coverImageUrl,
      trailerUrl,
      isPrivate,
      requiresApproval,
      tags,
    } = body;

    // Validate required fields
    if (!title || ticketPrice === undefined || !scheduledStart) {
      return NextResponse.json(
        { error: 'Missing required fields: title, ticketPrice, scheduledStart' },
        { status: 400 }
      );
    }

    // Create the show
    const show = await ShowService.createShow({
      creatorId: user.id,
      title,
      description,
      showType,
      ticketPrice,
      maxTickets,
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
      durationMinutes,
      coverImageUrl,
      trailerUrl,
      isPrivate,
      requiresApproval,
      tags,
    });

    return NextResponse.json({
      success: true,
      show,
    });
  } catch (error) {
    console.error('Error creating show:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create show' },
      { status: 500 }
    );
  }
}
