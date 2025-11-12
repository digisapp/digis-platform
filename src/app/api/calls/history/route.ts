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

    let calls: any[] = [];
    try {
      calls = await CallService.getCallHistory(user.id);
    } catch (dbError) {
      console.error('Database error fetching call history - returning empty array:', dbError);
      // Return empty array instead of error to prevent UI crash
    }

    return NextResponse.json({ calls });
  } catch (error: any) {
    console.error('Error fetching call history:', error);
    // Return empty array instead of 500 error to keep UI functional
    return NextResponse.json({ calls: [] });
  }
}
