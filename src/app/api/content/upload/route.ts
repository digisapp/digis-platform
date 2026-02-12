import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, contentItems, users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large video uploads

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

/**
 * POST - Upload content with file
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit uploads (10/min per IP)
    const rl = await rateLimit(request, 'upload');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait before uploading more content.' },
        { status: 429, headers: rl.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can upload content' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const files = formData.getAll('files') as File[]; // For gallery uploads
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const contentType = formData.get('contentType') as string;
    const unlockPrice = parseInt(formData.get('unlockPrice') as string) || 0;
    const isFree = formData.get('isFree') === 'true';

    // Validate required fields
    const isGallery = contentType === 'gallery';
    const hasFiles = isGallery ? files.length > 0 : file !== null;

    if (!hasFiles || !title || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Gallery validation: require at least 2 images
    if (isGallery && files.length < 2) {
      return NextResponse.json({ error: 'Gallery requires at least 2 images' }, { status: 400 });
    }

    // Validate content type
    if (!['photo', 'video', 'gallery'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Validate file types
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

    // For gallery: validate all files are images
    if (isGallery) {
      for (const galleryFile of files) {
        if (!validImageTypes.includes(galleryFile.type)) {
          return NextResponse.json({ error: 'All gallery files must be images (JPG, PNG, GIF, WEBP)' }, { status: 400 });
        }
        if (galleryFile.size > 50 * 1024 * 1024) {
          return NextResponse.json({ error: 'Each image must be under 50MB' }, { status: 400 });
        }
        // Validate file magic numbers match claimed type
        const galleryBytes = new Uint8Array(await galleryFile.slice(0, 12).arrayBuffer());
        if (!validateFileMagicNumbers(galleryBytes, 'image')) {
          return NextResponse.json({ error: 'File content does not match declared image type' }, { status: 400 });
        }
      }
    } else {
      // For single file uploads
      const isImage = validImageTypes.includes(file!.type);
      const isVideo = validVideoTypes.includes(file!.type);

      if (contentType === 'photo' && !isImage) {
        return NextResponse.json({ error: 'Invalid image file type' }, { status: 400 });
      }

      if (contentType === 'video' && !isVideo) {
        return NextResponse.json({ error: 'Invalid video file type' }, { status: 400 });
      }

      // Validate file magic numbers match claimed type
      const fileBytes = new Uint8Array(await file!.slice(0, 12).arrayBuffer());
      const expectedMagicType = contentType === 'video' ? 'video' : 'image';
      if (!validateFileMagicNumbers(fileBytes, expectedMagicType as 'image' | 'video')) {
        return NextResponse.json({ error: 'File content does not match declared type' }, { status: 400 });
      }

      // Check file size limits
      const maxSize = contentType === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file!.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        return NextResponse.json({ error: `File too large. Maximum size is ${maxSizeMB}MB` }, { status: 400 });
      }
    }

    // Upload to Supabase Storage
    const bucket = 'content';
    let thumbnailUrl: string;
    let mediaUrl: string;
    const uploadedFiles: string[] = [];

    try {
      if (isGallery) {
        // Upload all gallery images
        for (const galleryFile of files) {
          const ext = galleryFile.name.split('.').pop()?.toLowerCase() || 'jpg';
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, galleryFile, {
              cacheControl: '31536000',
              upsert: false,
              contentType: galleryFile.type,
            });

          if (uploadError) {
            // Clean up previously uploaded files
            if (uploadedFiles.length > 0) {
              await supabase.storage.from(bucket).remove(uploadedFiles);
            }
            throw new Error(`Failed to upload ${galleryFile.name}: ${uploadError.message}`);
          }

          uploadedFiles.push(fileName);
        }

        // Get public URLs for all uploaded files
        const publicUrls = uploadedFiles.map(fileName => {
          const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
          return publicUrl;
        });

        // Use first image as thumbnail
        thumbnailUrl = publicUrls[0];
        // Store all URLs as JSON
        mediaUrl = JSON.stringify(publicUrls);
      } else {
        // Single file upload (photo or video)
        const ext = file!.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file!, {
            cacheControl: '31536000',
            upsert: false,
            contentType: file!.type,
          });

        if (uploadError) {
          console.error('[CONTENT UPLOAD] Storage upload error:', {
            error: uploadError,
            bucket,
            fileName,
            fileType: file!.type,
            fileSize: file!.size,
          });
          return NextResponse.json({
            error: 'Upload failed. Please try again or use a smaller file.',
          }, { status: 500 });
        }

        uploadedFiles.push(fileName);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

        // For videos, use same URL as thumbnail (in production, generate actual thumbnail)
        thumbnailUrl = publicUrl;
        mediaUrl = publicUrl;
      }
    } catch (error: any) {
      console.error('[CONTENT UPLOAD] Upload error:', error);
      return NextResponse.json({
        error: 'Upload failed. Please try again.',
      }, { status: 500 });
    }

    // Calculate total file size for storage tracking
    const totalFileSize = isGallery
      ? files.reduce((sum, f) => sum + f.size, 0)
      : file!.size;

    // Create content item in database
    try {
      const [content] = await db.insert(contentItems).values({
        creatorId: user.id,
        title,
        description: description || null,
        contentType: contentType as 'photo' | 'video' | 'gallery',
        unlockPrice: isFree ? 0 : unlockPrice,
        isFree,
        thumbnailUrl,
        mediaUrl,
        durationSeconds: null, // Note: Videos use /api/content/create with client-extracted duration
        isPublished: true,
      }).returning();

      // Update creator's storage usage
      await db.update(users)
        .set({
          storageUsed: sql`${users.storageUsed} + ${totalFileSize}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({ content }, { status: 201 });
    } catch (dbError: any) {
      console.error('[CONTENT UPLOAD] Database error:', {
        error: dbError.message,
        userId: user.id,
        contentType,
      });

      // Clean up uploaded files if database insert fails
      if (uploadedFiles.length > 0) {
        await supabase.storage.from(bucket).remove(uploadedFiles);
      }

      return NextResponse.json({
        error: 'Something went wrong. Please try again.',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[CONTENT UPLOAD ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
