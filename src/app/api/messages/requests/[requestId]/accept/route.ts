import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

// POST /api/messages/requests/[requestId]/accept - Accept a message request
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

    const conversation = await MessageService.acceptMessageRequest(requestId);

    return NextResponse.json({
      conversation,
      message: 'Message request accepted',
    });
  } catch (error: any) {
    console.error('Error accepting message request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept message request' },
      { status: 500 }
    );
  }
}
