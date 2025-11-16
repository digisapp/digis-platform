import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, contentItems, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large video uploads

/**
 * POST - Upload content with file
 */
export async function POST(request: NextRequest) {
  try {
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
            error: 'Failed to upload file to storage',
            details: uploadError.message
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
        error: 'Failed to upload files to storage',
        details: error.message
      }, { status: 500 });
    }

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
        durationSeconds: contentType === 'video' ? 0 : null, // TODO: Extract video duration
        isPublished: true,
      }).returning();

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
        error: 'Failed to save content to database',
        details: dbError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[CONTENT UPLOAD ERROR]', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json({
      error: 'Failed to upload content',
      details: error.message
    }, { status: 500 });
  }
}
