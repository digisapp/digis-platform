import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, vods, users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video uploads

const MIN_PRICE = 25;
const MAX_DURATION = 1800; // 30 minutes

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
      return NextResponse.json({ error: 'Only creators can save recordings' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const title = formData.get('title') as string;
    const priceStr = formData.get('price') as string;
    const durationStr = formData.get('duration') as string;
    const streamId = formData.get('streamId') as string;

    // Validate required fields
    if (!videoFile || !title) {
      return NextResponse.json({ error: 'Video and title are required' }, { status: 400 });
    }

    // Validate price
    const price = parseInt(priceStr) || MIN_PRICE;
    if (price < MIN_PRICE) {
      return NextResponse.json({ error: `Minimum price is ${MIN_PRICE} coins` }, { status: 400 });
    }

    // Validate duration
    const duration = parseInt(durationStr) || 0;
    if (duration > MAX_DURATION) {
      return NextResponse.json({ error: `Maximum recording duration is ${MAX_DURATION / 60} minutes` }, { status: 400 });
    }

    // Validate file type
    const validVideoTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (!validVideoTypes.includes(videoFile.type)) {
      return NextResponse.json({ error: 'Invalid video format' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const bucket = 'recordings';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, videoFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: videoFile.type,
      });

    if (uploadError) {
      console.error('[RECORDING UPLOAD] Storage error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload recording' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

    // Generate thumbnail from video (use first frame or a placeholder)
    // For now, we'll use a placeholder - in production you'd extract a frame
    const thumbnailUrl = publicUrl; // TODO: Generate actual thumbnail

    // Create VOD record
    const [recording] = await db.insert(vods).values({
      creatorId: user.id,
      streamId: streamId || null,
      title,
      description: null,
      thumbnailUrl,
      videoUrl: publicUrl,
      duration,
      recordingType: 'manual',
      isDraft: false,
      isPublic: false, // PPV only
      priceCoins: price,
      subscribersOnly: false,
    }).returning();

    // Update creator's storage usage
    await db.update(users)
      .set({
        storageUsed: sql`${users.storageUsed} + ${videoFile.size}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      recording: {
        id: recording.id,
        title: recording.title,
        videoUrl: recording.videoUrl,
        duration: recording.duration,
        priceCoins: recording.priceCoins,
      },
    });
  } catch (error: any) {
    console.error('[RECORDING UPLOAD ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save recording' },
      { status: 500 }
    );
  }
}
