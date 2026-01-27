import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, clips, streams, users } from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute for clip uploads

const MAX_CLIP_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const title = formData.get('title') as string;
    const streamId = formData.get('streamId') as string;
    const durationStr = formData.get('duration') as string;

    // Validate required fields
    if (!videoFile || !title || !streamId) {
      return NextResponse.json(
        { error: 'Video, title, and streamId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(videoFile.type)) {
      return NextResponse.json({ error: 'Invalid video format' }, { status: 400 });
    }

    // Validate file size
    if (videoFile.size > MAX_CLIP_SIZE) {
      return NextResponse.json({ error: 'Clip file is too large (max 20MB)' }, { status: 400 });
    }

    // Verify stream exists
    const stream = await db.query.streams.findFirst({
      where: eq(streams.id, streamId),
    });

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Rate limit: max 1 clip per 30 seconds per user per stream
    const recentClip = await db.query.clips.findFirst({
      where: and(
        eq(clips.streamId, streamId),
        sql`${clips.createdAt} > NOW() - INTERVAL '30 seconds'`
      ),
      orderBy: [desc(clips.createdAt)],
    });

    if (recentClip) {
      return NextResponse.json(
        { error: 'Please wait before creating another clip' },
        { status: 429 }
      );
    }

    // Upload to Supabase Storage
    const bucket = 'recordings';
    const ext = videoFile.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `clips/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, videoFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: videoFile.type,
      });

    if (uploadError) {
      console.error('[CLIP UPLOAD] Storage error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload clip' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);

    // Parse duration
    const duration = parseInt(durationStr) || 30;

    // Create clip record
    // creatorId = the stream's creator (clips are promotional content for the creator)
    const [clip] = await db.insert(clips).values({
      creatorId: stream.creatorId,
      streamId: streamId,
      vodId: null,
      title,
      description: user.id === stream.creatorId
        ? 'Clipped live by creator'
        : 'Clipped live by viewer',
      videoUrl: publicUrl,
      duration: Math.min(duration, 30),
      startTime: 0,
      isPublic: true,
    }).returning();

    // Update creator's storage usage
    await db.update(users)
      .set({
        storageUsed: sql`${users.storageUsed} + ${videoFile.size}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, stream.creatorId));

    return NextResponse.json({
      clip: {
        id: clip.id,
        title: clip.title,
        videoUrl: clip.videoUrl,
        duration: clip.duration,
        creatorId: clip.creatorId,
      },
    });
  } catch (error: any) {
    console.error('[CLIP UPLOAD ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create clip' },
      { status: 500 }
    );
  }
}
