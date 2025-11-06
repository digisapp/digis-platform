import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';

// GET /api/messages/requests - Get pending message requests
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requests = await MessageService.getPendingRequests(user.id);

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error('Error fetching message requests:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch message requests' },
      { status: 500 }
    );
  }
}

// POST /api/messages/requests - Create a message request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { toUserId, initialMessage, isPaid, paidAmount } = await request.json();

    if (!toUserId || !initialMessage) {
      return NextResponse.json(
        { error: 'Recipient ID and initial message are required' },
        { status: 400 }
      );
    }

    const messageRequest = await MessageService.createMessageRequest(
      user.id,
      toUserId,
      initialMessage,
      isPaid || false,
      paidAmount || 0
    );

    return NextResponse.json({ request: messageRequest });
  } catch (error: any) {
    console.error('Error creating message request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create message request' },
      { status: 500 }
    );
  }
}
