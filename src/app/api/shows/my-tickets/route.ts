import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ShowService } from '@/lib/shows/show-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await ShowService.getUserTickets(user.id);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    // Fail soft: return empty data with 200
    return NextResponse.json({
      success: true,
      tickets: [],
      _error: 'temporarily_unavailable'
    });
  }
}
