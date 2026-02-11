import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MessageService } from '@/lib/messages/message-service';
import { rateLimitFinancial } from '@/lib/rate-limit';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody, uuidSchema, coinAmountSchema } from '@/lib/validation/schemas';
import { assertValidOrigin } from '@/lib/security/origin-check';

const messageTipSchema = z.object({
  conversationId: uuidSchema,
  receiverId: uuidSchema,
  amount: coinAmountSchema,
  tipMessage: z.string().max(500, 'Message too long').optional(),
  giftId: uuidSchema.optional(),
  giftEmoji: z.string().max(10).optional(),
  giftName: z.string().max(100).optional(),
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // CSRF origin validation for financial route
  const originCheck = assertValidOrigin(request, { requireHeader: true });
  if (!originCheck.ok) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // Validate input with Zod
    const validation = await validateBody(request, messageTipSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { conversationId, receiverId, amount, tipMessage, giftId, giftEmoji, giftName } = validation.data;

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
      tipMessage,
      giftId,
      giftEmoji,
      giftName
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
