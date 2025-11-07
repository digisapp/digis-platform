import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingCalls = await CallService.getPendingRequests(user.id);

    return NextResponse.json({ calls: pendingCalls });
  } catch (error: any) {
    console.error('Error fetching pending calls:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending calls' },
      { status: 500 }
    );
  }
}
