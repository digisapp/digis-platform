import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, cloudItems } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { processImage, processVideo } from '@/lib/services/media-processing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for video processing

/**
 * POST - Background media processing
 * Generates thumbnail + preview for a drops item
 * Called internally from the register endpoint (fire-and-forget)
 *
 * Body: { itemId, storagePath, type }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, storagePath, type } = body;

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

    // Skip if already processed
    if (item.thumbnailUrl && item.thumbnailUrl !== item.fileUrl) {
      return NextResponse.json({ status: 'already_processed' });
    }

    const supabase = await createClient();

    // Download original file from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from('drops-content')
      .download(storagePath);

    if (dlError || !fileData) {
      console.error('[PROCESS MEDIA] Download error:', dlError);
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    const ext = storagePath.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');

    // Process media
    const processed = type === 'photo'
      ? await processImage(fileBuffer)
      : await processVideo(fileBuffer, ext);

    const baseName = storagePath.replace(/\.[^.]+$/, '');

    // Upload thumbnail
    let thumbnailUrl = item.fileUrl;
    const thumbPath = `${baseName}_thumb.webp`;
    const { error: thumbErr } = await supabase.storage
      .from('drops-content')
      .upload(thumbPath, processed.thumbnail, {
        cacheControl: '31536000',
        upsert: true,
        contentType: processed.thumbnailMime,
      });
    if (!thumbErr) {
      thumbnailUrl = supabase.storage.from('drops-content').getPublicUrl(thumbPath).data.publicUrl;
    }

    // Upload preview
    let previewUrl: string | null = null;
    const previewExt = processed.previewMime === 'image/webp' ? 'webp' : 'jpg';
    const previewPath = `${baseName}_preview.${previewExt}`;
    const { error: prevErr } = await supabase.storage
      .from('drops-content')
      .upload(previewPath, processed.preview, {
        cacheControl: '31536000',
        upsert: true,
        contentType: processed.previewMime,
      });
    if (!prevErr) {
      previewUrl = supabase.storage.from('drops-content').getPublicUrl(previewPath).data.publicUrl;
    }

    // Update item with processed URLs
    await db.update(cloudItems)
      .set({
        thumbnailUrl,
        previewUrl,
      })
      .where(eq(cloudItems.id, itemId));

    return NextResponse.json({
      status: 'processed',
      thumbnailUrl,
      previewUrl,
    });
  } catch (error: any) {
    console.error('[PROCESS MEDIA ERROR]', { error: error.message });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
