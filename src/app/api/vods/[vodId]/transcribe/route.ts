import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods, vodTranscripts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { TranscriptionService } from '@/lib/services/transcription-service';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for transcription

/**
 * POST /api/vods/[vodId]/transcribe
 *
 * Trigger AI transcription + chapter generation for a VOD.
 * Creator-only. Runs async — returns immediately with transcript ID.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    // Rate limit (expensive operation)
    const rateLimitResult = await rateLimit(req, 'critical');
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before transcribing another video.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vodId } = await params;

    // Get VOD and verify ownership
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return NextResponse.json({ error: 'VOD not found' }, { status: 404 });
    }

    if (vod.creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can transcribe their VODs' }, { status: 403 });
    }

    if (!vod.videoUrl) {
      return NextResponse.json({ error: 'VOD has no video file' }, { status: 400 });
    }

    // Check if already transcribed or in progress
    const existing = await db.query.vodTranscripts.findFirst({
      where: and(
        eq(vodTranscripts.vodId, vodId),
      ),
    });

    if (existing) {
      if (existing.status === 'completed') {
        return NextResponse.json({ error: 'VOD already transcribed', transcriptId: existing.id }, { status: 409 });
      }
      if (existing.status === 'pending' || existing.status === 'transcribing' || existing.status === 'generating') {
        return NextResponse.json({ error: 'Transcription already in progress', transcriptId: existing.id }, { status: 409 });
      }
      // If failed, delete old record and retry
      await db.delete(vodTranscripts).where(eq(vodTranscripts.id, existing.id));
    }

    // Create transcript record
    const [transcript] = await db.insert(vodTranscripts).values({
      vodId,
      creatorId: user.id,
      status: 'pending',
      durationSeconds: vod.duration,
    }).returning();

    // Process synchronously — Vercel kills fire-and-forget promises after response
    await TranscriptionService.processVod(transcript.id);

    return NextResponse.json({
      transcriptId: transcript.id,
      status: 'completed',
      message: 'Transcription complete.',
    });

  } catch (error: any) {
    console.error('[Transcribe] Error:', error);
    return NextResponse.json({ error: 'Failed to start transcription' }, { status: 500 });
  }
}
