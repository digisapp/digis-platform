import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, wallets, streams } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';
import { BlockService } from '@/lib/services/block-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit financial operations
    const rateCheck = await rateLimitFinancial(user.id, 'gift');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) }
        }
      );
    }

    const { streamId } = await params;
    const { giftId, quantity = 1, recipientCreatorId, recipientUsername } = await req.json();

    // Check if user is blocked by the stream creator
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
      columns: { creatorId: true },
    });

    if (stream && stream.creatorId !== user.id) {
      const isBlocked = await BlockService.isBlockedByCreator(stream.creatorId, user.id);
      if (isBlocked) {
        return NextResponse.json({ error: 'You cannot send gifts in this stream' }, { status: 403 });
      }
    }

    if (!giftId) {
      return NextResponse.json({ error: 'Gift ID is required' }, { status: 400 });
    }

    if (quantity < 1 || quantity > 100) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get user details for username
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const username = dbUser.username || dbUser.displayName || 'Anonymous';
    const avatarUrl = dbUser.avatarUrl || null;

    const result = await StreamService.sendGift(
      streamId,
      user.id,
      username,
      giftId,
      quantity,
      recipientCreatorId,
      recipientUsername
    );

    // Broadcast gift animation to all viewers using Ably (scales to 50k+)
    await AblyRealtimeService.broadcastGift(streamId, {
      ...result.streamGift,
      senderAvatarUrl: avatarUrl,
      recipientCreatorId: result.recipientCreatorId || null,
      recipientUsername: result.recipientUsername || null,
    }, result.gift);

    // Fetch updated balance for the sender
    const senderWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, user.id),
    });

    return NextResponse.json({
      streamGift: result.streamGift,
      gift: result.gift,
      newBalance: senderWallet?.balance || 0,
    });
  } catch (error: any) {
    console.error('Error sending gift:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send gift' },
      { status: 500 }
    );
  }
}
