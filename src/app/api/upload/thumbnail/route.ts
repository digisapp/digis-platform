import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Validate image magic numbers to prevent MIME type spoofing
function isValidImageMagicNumbers(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const requestId = nanoid(10);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        failure('Unauthorized', 'auth', requestId),
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        failure('No file provided', 'validation', requestId),
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        failure('File must be an image', 'validation', requestId),
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        failure('File size must be less than 5MB', 'validation', requestId),
        { status: 400 }
      );
    }

    // Validate file content (magic numbers)
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    if (!isValidImageMagicNumbers(fileBuffer)) {
      return NextResponse.json(
        failure('Invalid image file content', 'validation', requestId),
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${nanoid()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('stream-thumbnails')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[UPLOAD/THUMBNAIL]', { requestId, error: error.message });
      return NextResponse.json(
        failure('Failed to upload thumbnail', 'unknown', requestId),
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('stream-thumbnails')
      .getPublicUrl(fileName);

    return NextResponse.json(
      success({ url: publicUrl }, requestId),
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[UPLOAD/THUMBNAIL]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      failure('Failed to upload thumbnail', 'unknown', requestId),
      { status: 500 }
    );
  }
}
