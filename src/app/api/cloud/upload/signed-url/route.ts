import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const CLOUD_STORAGE_QUOTA = 50 * 1024 * 1024 * 1024; // 50GB

const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/webm': 'webm',
};

/**
 * POST - Get a signed upload URL for direct client→Supabase upload
 * Body: { fileName, contentType, sizeBytes }
 * Returns: { signedUrl, storagePath, token }
 */
export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, 'upload');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rl.headers }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can upload' }, { status: 403 });
    }

    const body = await request.json();
    const { contentType, sizeBytes } = body;

    // Validate content type
    const isImage = validImageTypes.includes(contentType);
    const isVideo = validVideoTypes.includes(contentType);
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Validate size
    const maxSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
    if (sizeBytes > maxSize) {
      return NextResponse.json({
        error: `File too large. Max ${maxSize / (1024 * 1024)}MB for ${isVideo ? 'videos' : 'images'}.`,
      }, { status: 400 });
    }

    // Check storage quota
    if (dbUser.storageUsed + sizeBytes > CLOUD_STORAGE_QUOTA) {
      return NextResponse.json({
        error: `Storage limit reached (${(dbUser.storageUsed / (1024 * 1024 * 1024)).toFixed(1)}GB / 50GB).`,
      }, { status: 413 });
    }

    // Generate storage path
    const ext = EXT_MAP[contentType] || 'bin';
    const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Create signed upload URL (valid for 2 hours)
    const { data, error: signError } = await supabase.storage
      .from('drops-content')
      .createSignedUploadUrl(storagePath);

    if (signError || !data) {
      console.error('[CLOUD SIGNED URL] Error:', signError);
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
      type: isImage ? 'photo' : 'video',
    });
  } catch (error: any) {
    console.error('[CLOUD SIGNED URL ERROR]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
