import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';
import { db, messageRequests } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // SECURITY: Verify the user is the intended recipient of this request
    const messageRequest = await db.query.messageRequests.findFirst({
      where: eq(messageRequests.id, requestId),
      columns: { toUserId: true, status: true },
    });

    if (!messageRequest) {
      return NextResponse.json(
        { error: 'Message request not found' },
        { status: 404 }
      );
    }

    if (messageRequest.toUserId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to accept this request' },
        { status: 403 }
      );
    }

    if (messageRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been responded to' },
        { status: 400 }
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
      { error: 'Failed to accept message request' },
      { status: 500 }
    );
  }
}
