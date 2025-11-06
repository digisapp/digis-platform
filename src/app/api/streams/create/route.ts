import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const stream = await StreamService.createStream(user.id, title, description);

    return NextResponse.json({ stream }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating stream:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create stream' },
      { status: 500 }
    );
  }
}
