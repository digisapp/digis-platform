import { NextRequest, NextResponse } from 'next/server';
import { db, cloudItems } from '@/lib/data/system';
import { eq, sql, and } from 'drizzle-orm';
import { processImage, processVideo, remuxToMp4 } from '@/lib/services/media-processing-service';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;

/**
 * POST /api/cron/reprocess-media
 *
 * Primary background processor for cloud items.
 * Picks up items where processingStatus = 'pending' or 'failed' (with attempts < MAX).
 *
 * Runs every 15 minutes via Vercel cron. Also callable manually by admin.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find items that need processing:
    // 1. Status = 'pending' (never processed)
    // 2. Status = 'failed' with attempts < MAX (retry)
    // 3. Status = 'processing' stuck for > 10 min (timed out)
    const unprocessed = await db.execute(sql`
      SELECT id, file_url, thumbnail_url, type, creator_id,
             processing_status, processing_attempts, processing_error
      FROM cloud_items
      WHERE (
        processing_status = 'pending'
        OR (processing_status = 'failed' AND processing_attempts < ${MAX_ATTEMPTS})
        OR (processing_status = 'processing' AND uploaded_at < NOW() - INTERVAL '10 minutes')
      )
      AND file_url IS NOT NULL
      ORDER BY
        CASE processing_status
          WHEN 'pending' THEN 0
          WHEN 'processing' THEN 1
          ELSE 2
        END,
        uploaded_at ASC
      LIMIT ${BATCH_SIZE}
    `);

    const items = (unprocessed as any).rows || unprocessed;

    if (!items || items.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No items to process', processed: 0 });
    }

    const supabase = await createClient();
    let processed = 0;
    let failed = 0;
    const results: { id: string; status: string; error?: string }[] = [];

    for (const item of items) {
      try {
        // Mark as processing + increment attempts
        await db.update(cloudItems)
          .set({
            processingStatus: 'processing',
            processingAttempts: sql`${cloudItems.processingAttempts} + 1`,
            processingError: null,
          })
          .where(eq(cloudItems.id, item.id));

        // Extract storage path from public URL
        const pathMatch = item.file_url.match(/content\/(.+)$/);
        if (!pathMatch) {
          await db.update(cloudItems)
            .set({ processingStatus: 'failed', processingError: 'Could not extract storage path' })
            .where(eq(cloudItems.id, item.id));
          results.push({ id: item.id, status: 'skipped', error: 'Could not extract storage path' });
          failed++;
          continue;
        }
        const storagePath = pathMatch[1];

        // Download original file
        const { data: fileData, error: dlError } = await supabase.storage
          .from('content')
          .download(storagePath);

        if (dlError || !fileData) {
          const isMissing = dlError?.message?.includes('not found') || dlError?.message?.includes('404');
          if (isMissing) {
            // File deleted from storage — hide from profile
            await db.update(cloudItems)
              .set({
                status: 'private',
                processingStatus: 'failed',
                processingError: 'File missing from storage',
              })
              .where(and(eq(cloudItems.id, item.id)));
            results.push({ id: item.id, status: 'missing', error: 'File gone from storage — hidden' });
          } else {
            await db.update(cloudItems)
              .set({ processingStatus: 'failed', processingError: `Download: ${dlError?.message}` })
              .where(eq(cloudItems.id, item.id));
            results.push({ id: item.id, status: 'failed', error: `Download failed: ${dlError?.message}` });
          }
          failed++;
          continue;
        }

        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        const ext = storagePath.split('.').pop()?.toLowerCase() || (item.type === 'video' ? 'mp4' : 'jpg');
        const baseName = storagePath.replace(/\.[^.]+$/, '');

        // Process thumbnails + preview
        const result = item.type === 'photo'
          ? await processImage(fileBuffer)
          : await processVideo(fileBuffer, ext);

        // Upload thumbnail
        let thumbnailUrl = item.file_url;
        const thumbPath = `${baseName}_thumb.webp`;
        const { error: thumbErr } = await supabase.storage
          .from('content')
          .upload(thumbPath, result.thumbnail, {
            cacheControl: '31536000',
            upsert: true,
            contentType: result.thumbnailMime,
          });
        if (!thumbErr) {
          thumbnailUrl = supabase.storage.from('content').getPublicUrl(thumbPath).data.publicUrl;
        }

        // Upload preview
        let previewUrl: string | null = null;
        const previewExt = result.previewMime === 'image/webp' ? 'webp' : 'jpg';
        const previewPath = `${baseName}_preview.${previewExt}`;
        const { error: prevErr } = await supabase.storage
          .from('content')
          .upload(previewPath, result.preview, {
            cacheControl: '31536000',
            upsert: true,
            contentType: result.previewMime,
          });
        if (!prevErr) {
          previewUrl = supabase.storage.from('content').getPublicUrl(previewPath).data.publicUrl;
        }

        // Video remux: .mov → .mp4 for browser compatibility
        let playbackUrl: string | null = null;
        if (item.type === 'video' && ext === 'mov' && fileBuffer.length <= 200 * 1024 * 1024) {
          try {
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
            console.warn(`[REPROCESS] Remux failed for ${item.id}: ${err.message}`);
            // Non-fatal — item still works on Safari, just not Chrome for .mov
          }
        }

        // Mark as ready
        await db.update(cloudItems)
          .set({
            thumbnailUrl,
            previewUrl,
            playbackUrl,
            processingStatus: 'ready',
            processingError: null,
            processedAt: new Date(),
          })
          .where(eq(cloudItems.id, item.id));

        processed++;
        results.push({ id: item.id, status: 'processed' });
      } catch (err: any) {
        await db.update(cloudItems)
          .set({
            processingStatus: 'failed',
            processingError: err.message?.slice(0, 500),
          })
          .where(eq(cloudItems.id, item.id));

        failed++;
        results.push({ id: item.id, status: 'failed', error: err.message });
        console.error(`[REPROCESS] Item ${item.id} failed:`, err.message);
      }
    }

    console.log(`[REPROCESS] Done: ${processed} processed, ${failed} failed out of ${items.length} items`);

    return NextResponse.json({
      status: 'ok',
      total: items.length,
      processed,
      failed,
      results,
    });
  } catch (error: any) {
    console.error('[REPROCESS MEDIA ERROR]', error.message);
    return NextResponse.json({ error: 'Reprocessing failed' }, { status: 500 });
  }
}
