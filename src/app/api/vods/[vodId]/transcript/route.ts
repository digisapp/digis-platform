import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods, vodTranscripts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { hasVODAccess } from '@/lib/vods/vod-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/vods/[vodId]/transcript
 *
 * Get transcript + chapters for a VOD.
 * Respects VOD access control (purchased, subscriber, public, or creator).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { vodId } = await params;

    // Check VOD exists
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return NextResponse.json({ error: 'VOD not found' }, { status: 404 });
    }

    // Check access — same rules as watching the VOD
    if (user) {
      const access = await hasVODAccess({ vodId, userId: user.id });
      if (!access.hasAccess) {
        return NextResponse.json({
          error: 'Purchase or subscribe to view this transcript',
          requiresPurchase: access.requiresPurchase,
          price: access.price,
        }, { status: 403 });
      }
    } else if (!vod.isPublic) {
      return NextResponse.json({ error: 'Sign in to view this transcript' }, { status: 401 });
    }

    // Get transcript
    const transcript = await db.query.vodTranscripts.findFirst({
      where: eq(vodTranscripts.vodId, vodId),
    });

    if (!transcript) {
      return NextResponse.json({
        exists: false,
        status: null,
        message: 'No transcript available for this VOD',
      });
    }

    if (transcript.status !== 'completed') {
      return NextResponse.json({
        exists: true,
        status: transcript.status,
        transcriptId: transcript.id,
        message: transcript.status === 'failed'
          ? `Transcription failed: ${transcript.errorMessage || 'Unknown error'}`
          : 'Transcription is being processed...',
      });
    }

    return NextResponse.json({
      exists: true,
      status: 'completed',
      transcriptId: transcript.id,
      fullText: transcript.fullText,
      segments: transcript.segments,
      chapters: transcript.chapters,
      language: transcript.language,
      durationSeconds: transcript.durationSeconds,
      wordCount: transcript.wordCount,
      completedAt: transcript.completedAt,
    });

  } catch (error: any) {
    console.error('[Transcript] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
  }
}

/**
 * DELETE /api/vods/[vodId]/transcript
 *
 * Delete a transcript. Creator-only.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vodId } = await params;

    // Verify ownership
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod || vod.creatorId !== user.id) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    await db.delete(vodTranscripts).where(eq(vodTranscripts.vodId, vodId));

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Transcript] Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete transcript' }, { status: 500 });
  }
}
