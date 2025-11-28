import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Broadcast typing status
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, isTyping } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Broadcast typing status via Supabase Realtime
    const channel = supabase.channel(`typing-${conversationId}`);

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        isTyping: isTyping ?? true,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error broadcasting typing status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to broadcast typing' },
      { status: 500 }
    );
  }
}
