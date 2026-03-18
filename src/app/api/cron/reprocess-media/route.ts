import { NextRequest, NextResponse } from 'next/server';
import { db, cloudItems } from '@/lib/data/system';
import { eq, sql, and } from 'drizzle-orm';
import { processImage, processVideo } from '@/lib/services/media-processing-service';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 10;

/**
 * POST /api/cron/reprocess-media
 *
 * Finds cloud items where thumbnail processing failed
 * (thumbnailUrl equals fileUrl or is null) and reprocesses them.
 *
 * Runs as a cron job every hour. Also callable manually by admin.
 * Processes up to BATCH_SIZE items per run to stay within time limits.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find items where thumbnailUrl = fileUrl (processing failed/never completed)
    // or thumbnailUrl is null
    const unprocessed = await db.execute(sql`
      SELECT id, file_url, thumbnail_url, type, creator_id
      FROM cloud_items
      WHERE (
        thumbnail_url = file_url
        OR thumbnail_url IS NULL
      )
      AND file_url IS NOT NULL
      AND status IN ('live', 'private')
      ORDER BY uploaded_at DESC
      LIMIT ${BATCH_SIZE}
    `);

    const items = (unprocessed as any).rows || unprocessed;

    if (!items || items.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No unprocessed items found', processed: 0 });
    }

    const supabase = await createClient();
    let processed = 0;
    let failed = 0;
    const results: { id: string; status: string; error?: string }[] = [];

    for (const item of items) {
      try {
        // Extract storage path from public URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/content/userId/filename.ext
        const pathMatch = item.file_url.match(/content\/(.+)$/);
        if (!pathMatch) {
          results.push({ id: item.id, status: 'skipped', error: 'Could not extract storage path' });
          continue;
        }
        const storagePath = pathMatch[1];

        // Download original file
        const { data: fileData, error: dlError } = await supabase.storage
          .from('content')
          .download(storagePath);

        if (dlError || !fileData) {
          // If file is gone from storage, mark the DB record as deleted
          if (dlError?.message?.includes('not found') || dlError?.message?.includes('404')) {
            await db.update(cloudItems)
              .set({ status: 'private' })
              .where(and(eq(cloudItems.id, item.id), eq(cloudItems.status, 'live')));
            results.push({ id: item.id, status: 'removed', error: 'File missing from storage — hidden from profile' });
          } else {
            results.push({ id: item.id, status: 'failed', error: `Download failed: ${dlError?.message}` });
          }
          failed++;
          continue;
        }

        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        const ext = storagePath.split('.').pop() || (item.type === 'video' ? 'mp4' : 'jpg');

        // Process
        const result = item.type === 'photo'
          ? await processImage(fileBuffer)
          : await processVideo(fileBuffer, ext);

        const baseName = storagePath.replace(/\.[^.]+$/, '');

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

        // Update DB
        await db.update(cloudItems)
          .set({ thumbnailUrl, previewUrl })
          .where(eq(cloudItems.id, item.id));

        processed++;
        results.push({ id: item.id, status: 'processed' });
      } catch (err: any) {
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
