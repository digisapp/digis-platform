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

    const settings = await CallService.getCreatorSettings(user.id);

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching creator settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Validate updates
    if (updates.callRatePerMinute !== undefined && updates.callRatePerMinute < 1) {
      return NextResponse.json(
        { error: 'Call rate must be at least 1 coin per minute' },
        { status: 400 }
      );
    }

    if (updates.minimumCallDuration !== undefined && updates.minimumCallDuration < 1) {
      return NextResponse.json(
        { error: 'Minimum call duration must be at least 1 minute' },
        { status: 400 }
      );
    }

    const settings = await CallService.updateCreatorSettings(user.id, updates);

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error updating creator settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
