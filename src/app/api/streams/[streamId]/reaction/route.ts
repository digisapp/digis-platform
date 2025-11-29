import { NextRequest, NextResponse } from 'next/server';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valid reaction emojis
const VALID_EMOJIS = ['🔥', '❤️', '😂', '👏', '😮', '💀'];

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
    const { emoji } = await req.json();

    // Validate emoji
    if (!emoji || !VALID_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: 'Invalid reaction emoji' },
        { status: 400 }
      );
    }

    // Get user details for username
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    const username = dbUser?.username || dbUser?.displayName || 'Anonymous';

    // Broadcast reaction to all viewers via Ably
    await AblyRealtimeService.broadcastReaction(streamId, emoji, user.id, username);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending reaction:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reaction' },
      { status: 500 }
    );
  }
}
