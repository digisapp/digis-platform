import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { RealtimeService } from '@/lib/streams/realtime-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';

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

    const { streamId } = await params;
    const { amount } = await req.json();

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Tip amount is required (minimum 1 coin)' }, { status: 400 });
    }

    if (amount > 100000) {
      return NextResponse.json(
        { error: 'Maximum tip amount is 100,000 coins' },
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

    const result = await StreamService.sendTip(
      streamId,
      user.id,
      username,
      amount
    );

    // Broadcast tip to all viewers in real-time
    await RealtimeService.broadcastTip(streamId, {
      senderId: user.id,
      senderUsername: username,
      senderAvatarUrl: avatarUrl,
      amount,
    });

    return NextResponse.json({
      success: true,
      amount,
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error('Error sending tip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send tip' },
      { status: 500 }
    );
  }
}
