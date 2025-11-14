import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { contentItems, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const contentType = formData.get('contentType') as string;
    const unlockPrice = parseInt(formData.get('unlockPrice') as string) || 0;
    const isFree = formData.get('isFree') === 'true';

    // Validate required fields
    if (!file || !title || !contentType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate content type
    if (!['photo', 'video', 'gallery'].includes(contentType)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    const isImage = validImageTypes.includes(file.type);
    const isVideo = validVideoTypes.includes(file.type);

    if (contentType === 'photo' && !isImage) {
      return NextResponse.json({ error: 'Invalid image file type' }, { status: 400 });
    }

    if (contentType === 'video' && !isVideo) {
      return NextResponse.json({ error: 'Invalid video file type' }, { status: 400 });
    }

    // Check file size limits
    const maxSize = contentType === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024; // 500MB for video, 50MB for images
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json({ error: `File too large. Maximum size is ${maxSizeMB}MB` }, { status: 400 });
    }

    // Upload to Supabase Storage
    const bucket = 'content';
    const ext = file.name.split('.').pop()?.toLowerCase() || (isImage ? 'jpg' : 'mp4');
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

    // For videos, generate a thumbnail (for now, use same URL as placeholder)
    const thumbnailUrl = contentType === 'video'
      ? publicUrl // In production, you'd generate a thumbnail
      : publicUrl;

    // Create content item in database
    const [content] = await db.insert(contentItems).values({
      creatorId: user.id,
      title,
      description: description || null,
      contentType: contentType as 'photo' | 'video' | 'gallery',
      unlockPrice: isFree ? 0 : unlockPrice,
      isFree,
      thumbnailUrl,
      mediaUrl: publicUrl,
      durationSeconds: contentType === 'video' ? 0 : null, // TODO: Extract video duration
      isPublished: true,
    }).returning();

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: any) {
    console.error('[CONTENT UPLOAD ERROR]', error);
    return NextResponse.json({ error: 'Failed to upload content' }, { status: 500 });
  }
}
