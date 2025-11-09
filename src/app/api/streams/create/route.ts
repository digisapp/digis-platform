import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for Drizzle ORM (used by StreamService)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[STREAMS/CREATE] Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log('[STREAMS/CREATE] Creating stream for user:', user.id, 'title:', title);

    // Add timeout to stream creation
    const streamPromise = StreamService.createStream(user.id, title, description);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Stream creation timeout - database may be slow')), 8000)
    );

    const stream = await Promise.race([streamPromise, timeoutPromise]);

    console.log('[STREAMS/CREATE] Stream created successfully:', stream.id);

    return NextResponse.json({ stream }, { status: 201 });
  } catch (error: any) {
    console.error('[STREAMS/CREATE ERROR]', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to create stream - please try again' },
      { status: 500 }
    );
  }
}
