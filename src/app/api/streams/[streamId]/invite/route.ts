import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a shareable invite link for a private stream
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { streamId } = await params;

    // Verify the stream exists and user is the creator
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, creator_id, privacy, status')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Only the creator can generate invite links
    if (stream.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the stream creator can generate invite links' },
        { status: 403 }
      );
    }

    // Generate the invite URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://www.digis.cc';
    const inviteUrl = `${baseUrl}/stream/${streamId}?invite=true`;

    return NextResponse.json({
      inviteUrl,
      streamId,
      privacy: stream.privacy,
    });
  } catch (error: any) {
    console.error('[Stream Invite] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invite link' },
      { status: 500 }
    );
  }
}
