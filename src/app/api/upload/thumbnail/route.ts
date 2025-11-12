import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { success, failure } from '@/types/api';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${nanoid()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('stream-thumbnails')
      .upload(fileName, file, {
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
