import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

// POST /api/messages/requests/[requestId]/decline - Decline a message request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await MessageService.declineMessageRequest(requestId);

    return NextResponse.json({
      message: 'Message request declined',
    });
  } catch (error: any) {
    console.error('Error declining message request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to decline message request' },
      { status: 500 }
    );
  }
}
