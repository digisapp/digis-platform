import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';
import { db } from '@/lib/data/system';
import { shows } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get show details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await params;

    const show = await db.query.shows.findFirst({
      where: eq(shows.id, showId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Check if current user has a ticket
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let hasTicket = false;
    if (user) {
      hasTicket = await ShowService.hasTicket(user.id, showId);
    }

    return NextResponse.json({
      success: true,
      show,
      hasTicket,
    });
  } catch (error) {
    console.error('Error fetching show:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show' },
      { status: 500 }
    );
  }
}

// PATCH - Update show details
export async function PATCH(
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

    const updated = await ShowService.updateShow(showId, user.id, body);

    return NextResponse.json({
      success: true,
      show: updated,
    });
  } catch (error) {
    console.error('Error updating show:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update show' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel show
export async function DELETE(
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

    const result = await ShowService.cancelShow(showId, user.id);

    return NextResponse.json({
      success: true,
      message: `Show cancelled successfully`,
      cancelledTickets: result.cancelledTickets,
    });
  } catch (error) {
    console.error('Error cancelling show:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel show' },
      { status: 500 }
    );
  }
}
