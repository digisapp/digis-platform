import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { RealtimeService } from '@/lib/streams/realtime-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    const { streamId } = await params;
    const { giftId, quantity = 1 } = await req.json();

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

    const result = await StreamService.sendGift(
      streamId,
      user.id,
      username,
      giftId,
      quantity
    );

    // Broadcast gift animation to all viewers in real-time
    await RealtimeService.broadcastGift(streamId, result.streamGift, result.gift);

    return NextResponse.json({
      streamGift: result.streamGift,
      gift: result.gift,
    });
  } catch (error: any) {
    console.error('Error sending gift:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send gift' },
      { status: 500 }
    );
  }
}
