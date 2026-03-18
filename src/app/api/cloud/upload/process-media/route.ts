import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, cloudItems } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { processImage, processVideo } from '@/lib/services/media-processing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for video processing

const MAX_ATTEMPTS = 3;

/**
 * POST - Process a single cloud item (thumbnail + preview + video remux)
 *
 * Called from:
 *  1. Register endpoint (immediate best-effort attempt)
 *  2. Reprocess-media cron (picks up pending/failed items)
 *
 * Body: { itemId, storagePath, type }
 */
export async function POST(request: NextRequest) {
  let parsedItemId: string | null = null;

  try {
    const body = await request.json();
    const { itemId, storagePath, type } = body;
    parsedItemId = itemId;

    if (!itemId || !storagePath || !type) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify item exists
    const item = await db.query.cloudItems.findFirst({
      where: eq(cloudItems.id, itemId),
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Skip if already fully processed
    if (item.processingStatus === 'ready') {
      return NextResponse.json({ status: 'already_processed' });
    }

    // Don't exceed max attempts
    if (item.processingAttempts >= MAX_ATTEMPTS) {
      await db.update(cloudItems)
        .set({ processingStatus: 'failed', processingError: 'Max attempts exceeded' })
        .where(eq(cloudItems.id, itemId));
      return NextResponse.json({ status: 'max_attempts_exceeded' });
    }

    // Mark as processing + increment attempts
    await db.update(cloudItems)
      .set({
        processingStatus: 'processing',
        processingAttempts: sql`${cloudItems.processingAttempts} + 1`,
        processingError: null,
      })
      .where(eq(cloudItems.id, itemId));

    const supabase = await createClient();

    // Download original file from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from('content')
      .download(storagePath);

    if (dlError || !fileData) {
      const errorMsg = dlError?.message?.includes('not found') || dlError?.message?.includes('404')
        ? 'File missing from storage'
        : `Download failed: ${dlError?.message}`;

      await db.update(cloudItems)
        .set({ processingStatus: 'failed', processingError: errorMsg })
        .where(eq(cloudItems.id, itemId));

      console.error('[PROCESS MEDIA] Download error:', dlError);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    const ext = storagePath.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg');
    const baseName = storagePath.replace(/\.[^.]+$/, '');

    // Process media (thumbnails + preview)
    const processed = type === 'photo'
      ? await processImage(fileBuffer)
      : await processVideo(fileBuffer, ext);

    // Upload thumbnail
    let thumbnailUrl = item.fileUrl;
    const thumbPath = `${baseName}_thumb.webp`;
    const { error: thumbErr } = await supabase.storage
      .from('content')
      .upload(thumbPath, processed.thumbnail, {
        cacheControl: '31536000',
        upsert: true,
        contentType: processed.thumbnailMime,
      });
    if (!thumbErr) {
      thumbnailUrl = supabase.storage.from('content').getPublicUrl(thumbPath).data.publicUrl;
    }

    // Upload preview
    let previewUrl: string | null = null;
    const previewExt = processed.previewMime === 'image/webp' ? 'webp' : 'jpg';
    const previewPath = `${baseName}_preview.${previewExt}`;
    const { error: prevErr } = await supabase.storage
      .from('content')
      .upload(previewPath, processed.preview, {
        cacheControl: '31536000',
        upsert: true,
        contentType: processed.previewMime,
      });
    if (!prevErr) {
      previewUrl = supabase.storage.from('content').getPublicUrl(previewPath).data.publicUrl;
    }

    // Video remux: .mov → .mp4 for browser compatibility
    let playbackUrl: string | null = null;
    if (type === 'video' && ext === 'mov' && fileBuffer.length <= 200 * 1024 * 1024) {
      try {
        const { remuxToMp4 } = await import('@/lib/services/media-processing-service');
        const mp4Buffer = await remuxToMp4(fileBuffer);
        if (mp4Buffer) {
          const mp4Path = `${baseName}_playback.mp4`;
          const { error: mp4Err } = await supabase.storage
            .from('content')
            .upload(mp4Path, mp4Buffer, {
              cacheControl: '31536000',
              upsert: true,
              contentType: 'video/mp4',
            });
          if (!mp4Err) {
            playbackUrl = supabase.storage.from('content').getPublicUrl(mp4Path).data.publicUrl;
          }
        }
      } catch (err: any) {
        // Remux failed — original file still works on Safari/iOS, just not Chrome
        console.warn(`[PROCESS MEDIA] Remux failed for ${itemId}: ${err.message}`);
      }
    }

    // Update item — mark as ready
    await db.update(cloudItems)
      .set({
        thumbnailUrl,
        previewUrl,
        playbackUrl,
        processingStatus: 'ready',
        processingError: null,
        processedAt: new Date(),
      })
      .where(eq(cloudItems.id, itemId));

    return NextResponse.json({
      status: 'processed',
      thumbnailUrl,
      previewUrl,
      playbackUrl,
    });
  } catch (error: any) {
    console.error('[PROCESS MEDIA ERROR]', { error: error.message });

    // Try to mark as failed if we parsed an itemId before the error
    if (parsedItemId) {
      try {
        await db.update(cloudItems)
          .set({
            processingStatus: 'failed',
            processingError: error.message?.slice(0, 500),
          })
          .where(eq(cloudItems.id, parsedItemId));
      } catch {}
    }

    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
