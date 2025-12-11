import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';
import { rateLimitFinancial } from '@/lib/rate-limit';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limit financial operations
    const rateCheck = await rateLimitFinancial(user.id, 'tip');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) }
        }
      );
    }

    const body = await request.json();
    const { conversationId, receiverId, amount, tipMessage } = body;

    if (!conversationId || !receiverId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount < 1) {
      return NextResponse.json(
        { error: 'Tip amount must be at least 1 coin' },
        { status: 400 }
      );
    }

    if (user.id === receiverId) {
      return NextResponse.json(
        { error: 'Cannot tip yourself' },
        { status: 400 }
      );
    }

    // Verify receiver is a creator (only creators can receive tips)
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, receiverId),
      columns: { id: true, role: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    if (receiver.role !== 'creator') {
      return NextResponse.json(
        { error: 'Tips can only be sent to creators' },
        { status: 400 }
      );
    }

    const message = await MessageService.sendTip(
      conversationId,
      user.id,
      receiverId,
      amount,
      tipMessage
    );

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending tip:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send tip' },
      { status: 500 }
    );
  }
}
