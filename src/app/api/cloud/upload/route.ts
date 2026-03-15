import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, cloudItems } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { processImage, processVideo } from '@/lib/services/media-processing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large uploads

function validateFileMagicNumbers(bytes: Uint8Array, expectedType: 'image' | 'video'): boolean {
  if (bytes.length < 12) return false;
  if (expectedType === 'image') {
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true; // JPEG
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true; // PNG
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true; // GIF
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true; // WebP
    return false;
  }
  if (expectedType === 'video') {
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true; // MP4/MOV
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true; // WebM
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49) return true; // AVI
    return false;
  }
  return false;
}

const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;  // 50MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB (larger for Drops — creators upload full camera roll)
const CLOUD_STORAGE_QUOTA = 50 * 1024 * 1024 * 1024; // 50GB

/**
 * POST - Upload one or more files to Drops
 * Accepts multipart form data with 'files' field (multiple files)
 * Optional: 'durationSeconds' for videos (client-extracted)
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, 'upload');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait before uploading more.' },
        { status: 429, headers: rl.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify creator role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can upload to Cloud' }, { status: 403 });
    }

    // Check storage quota (50GB for Drops)
    if (dbUser.storageUsed >= CLOUD_STORAGE_QUOTA) {
      return NextResponse.json(
        { error: `Storage limit reached (${(dbUser.storageUsed / (1024 * 1024 * 1024)).toFixed(1)}GB / 50GB).` },
        { status: 413 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 files per upload' }, { status: 400 });
    }

    // Validate all files before uploading any
    const fileInfos: Array<{ file: File; type: 'photo' | 'video'; sizeBytes: number }> = [];

    for (const file of files) {
      const isImage = validImageTypes.includes(file.type);
      const isVideo = validVideoTypes.includes(file.type);

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}. Use JPG, PNG, GIF, WebP, MP4, MOV, or WebM.` },
          { status: 400 }
        );
      }

      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        const maxMB = maxSize / (1024 * 1024);
        return NextResponse.json(
          { error: `${file.name} is too large. Max ${maxMB}MB for ${isVideo ? 'videos' : 'images'}.` },
          { status: 400 }
        );
      }

      // Validate magic numbers
      const fileBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const expectedType = isVideo ? 'video' : 'image';
      if (!validateFileMagicNumbers(fileBytes, expectedType)) {
        return NextResponse.json(
          { error: `${file.name} content does not match its file type` },
          { status: 400 }
        );
      }

      fileInfos.push({
        file,
        type: isImage ? 'photo' : 'video',
        sizeBytes: file.size,
      });
    }

    // Upload files to Supabase Storage
    const bucket = 'drops-content';
    const uploadedPaths: string[] = [];
    const createdItems: Array<typeof cloudItems.$inferSelect> = [];
    let totalSizeBytes = 0;

    try {
      for (const { file, type, sizeBytes } of fileInfos) {
        const ext = file.name.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mp4' : 'jpg');
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: '31536000',
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          console.error('[CLOUD UPLOAD] Storage error:', { error: uploadError, fileName });
          // Clean up already uploaded files
          if (uploadedPaths.length > 0) {
            await supabase.storage.from(bucket).remove(uploadedPaths);
          }
          return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
        }

        uploadedPaths.push(fileName);

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

        // Parse client-provided duration for videos
        const durationKey = `duration_${files.indexOf(file)}`;
        const durationSeconds = type === 'video'
          ? parseInt(formData.get(durationKey) as string) || null
          : null;

        // Generate thumbnail + preview
        let thumbnailUrl = publicUrl;
        let previewUrl: string | null = null;

        try {
          const fileBuffer = Buffer.from(await file.arrayBuffer());
          const processed = type === 'photo'
            ? await processImage(fileBuffer)
            : await processVideo(fileBuffer, ext);

          const baseName = fileName.replace(/\.[^.]+$/, '');

          // Upload thumbnail
          const thumbPath = `${baseName}_thumb.webp`;
          const { error: thumbErr } = await supabase.storage
            .from(bucket)
            .upload(thumbPath, processed.thumbnail, {
              cacheControl: '31536000',
              upsert: false,
              contentType: processed.thumbnailMime,
            });
          if (!thumbErr) {
            thumbnailUrl = supabase.storage.from(bucket).getPublicUrl(thumbPath).data.publicUrl;
          }

          // Upload preview
          const previewExt = processed.previewMime === 'image/webp' ? 'webp' : 'jpg';
          const previewPath = `${baseName}_preview.${previewExt}`;
          const { error: prevErr } = await supabase.storage
            .from(bucket)
            .upload(previewPath, processed.preview, {
              cacheControl: '31536000',
              upsert: false,
              contentType: processed.previewMime,
            });
          if (!prevErr) {
            previewUrl = supabase.storage.from(bucket).getPublicUrl(previewPath).data.publicUrl;
          }
        } catch (procErr: any) {
          // Processing failed — fall back to original URL for thumbnail
          console.error('[CLOUD UPLOAD] Media processing error (non-fatal):', procErr.message);
        }

        // Insert drops item — everything starts as private
        const [item] = await db.insert(cloudItems).values({
          creatorId: user.id,
          fileUrl: publicUrl,
          thumbnailUrl,
          previewUrl,
          type,
          durationSeconds,
          sizeBytes,
          status: 'private',
        }).returning();

        createdItems.push(item);
        totalSizeBytes += sizeBytes;
      }

      // Update creator's storage usage
      await db.update(users)
        .set({
          storageUsed: sql`${users.storageUsed} + ${totalSizeBytes}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        items: createdItems,
        uploaded: createdItems.length,
        totalSizeBytes,
      }, { status: 201 });

    } catch (error: any) {
      console.error('[CLOUD UPLOAD] Error:', { error: error.message, userId: user.id });
      // Clean up uploaded files on failure
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(bucket).remove(uploadedPaths);
      }
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[CLOUD UPLOAD ERROR]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
