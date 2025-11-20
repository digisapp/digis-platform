import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    // Get current user ID
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Check access control
    const accessCheck = await StreamService.checkStreamAccess(streamId, userId);

    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.reason || 'Access denied' },
        { status: 403 }
      );
    }

    const stream = await StreamService.getStream(streamId);

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    return NextResponse.json({ stream });
  } catch (error: any) {
    console.error('Error fetching stream:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stream' },
      { status: 500 }
    );
  }
}
