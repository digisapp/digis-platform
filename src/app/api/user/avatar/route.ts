import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Upload a new avatar image
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid image type. Use JPG, PNG, GIF, or WEBP' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const bucket = 'avatars';
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${user.id}/${Date.now()}.${ext}`;

    // Delete old avatar if exists (optional cleanup)
    const { data: existingFiles } = await supabase.storage
      .from(bucket)
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
      await supabase.storage.from(bucket).remove(filesToDelete);
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[AVATAR UPLOAD] Storage error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

    // Update user record in database
    const [updatedUser] = await db
      .update(users)
      .set({
        avatarUrl: publicUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    // Also update Supabase Auth metadata
    await supabase.auth.updateUser({
      data: {
        avatar_url: publicUrl,
      },
    });

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[AVATAR UPLOAD ERROR]', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
