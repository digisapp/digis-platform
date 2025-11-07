import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId } = await request.json();

    if (!creatorId) {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    // Request the call
    const call = await CallService.requestCall(user.id, creatorId);

    return NextResponse.json({
      call,
      message: 'Call requested successfully! The creator will be notified.',
    });
  } catch (error: any) {
    console.error('Error requesting call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to request call' },
      { status: 400 }
    );
  }
}
