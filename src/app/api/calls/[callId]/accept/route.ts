import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CallService } from '@/lib/calls/call-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const call = await CallService.acceptCall(callId, user.id);

    return NextResponse.json({ call });
  } catch (error) {
    console.error('Call accept error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept call' },
      { status: 500 }
    );
  }
}
