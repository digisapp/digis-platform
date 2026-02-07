import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { calls } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const rl = await rateLimit(request, 'default');
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rl.headers });
    }

    const { callId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the call
    const call = await db.query.calls.findFirst({
      where: eq(calls.id, callId),
    });

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify user is a participant
    if (call.fanId !== user.id && call.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    // Only allow saving for active or completed calls
    if (call.status !== 'active' && call.status !== 'completed') {
      return NextResponse.json({ error: 'Call is not active or completed' }, { status: 400 });
    }

    // Don't overwrite if already saved
    if (call.chatLog) {
      return NextResponse.json({ ok: true, message: 'Chat log already saved' });
    }

    const body = await request.json();
    const { messages } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
    }

    // Limit to 500 messages max to prevent abuse
    const trimmed = messages.slice(-500);

    await db
      .update(calls)
      .set({ chatLog: trimmed, updatedAt: new Date() })
      .where(eq(calls.id, callId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving chat log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
