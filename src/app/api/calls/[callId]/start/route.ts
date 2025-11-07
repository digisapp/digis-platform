import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { CallService } from '@/lib/services/call-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const call = await CallService.startCall(callId, user.id);

    return NextResponse.json({
      call,
      message: 'Call started successfully',
    });
  } catch (error: any) {
    console.error('Error starting call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start call' },
      { status: 400 }
    );
  }
}
