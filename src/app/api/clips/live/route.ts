import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, clips, streams, users } from '@/lib/data/system';
import { eq, and, desc, sql } from 'drizzle-orm';
import { applyWatermark } from '@/lib/services/watermark-service';
import { writeFile, readFile, unlink, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Force Node.js runtime for Drizzle ORM + FFmpeg
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for upload + FFmpeg processing

const MAX_CLIP_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  const tmpFiles: string[] = [];

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
    const creatorUsername = formData.get('creatorUsername') as string | null;

    // Validate required fields
    if (!videoFile || !title || !streamId) {
      return NextResponse.json(
        { error: 'Video, title, and streamId are required' },
        { status: 400 }
      );
    }

    // Validate file type (use startsWith to accept codec params like video/mp4;codecs=...)
    const validTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (!validTypes.some(t => videoFile.type.startsWith(t))) {
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

    // Only the stream creator can save clips to their profile
    if (user.id !== stream.creatorId) {
      return NextResponse.json({ error: 'Only the stream creator can save clips' }, { status: 403 });
    }

    // Rate limit: max 1 clip per 30 seconds per stream (global cooldown)
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

    // Write uploaded video to temp file
    const uuid = randomUUID();
    const tmp = tmpdir();
    const inputExt = videoFile.type.includes('mp4') ? 'mp4' : 'webm';
    const inputPath = join(tmp, `clip-${uuid}-input.${inputExt}`);
    const outputPath = join(tmp, `clip-${uuid}-output.mp4`);
    tmpFiles.push(inputPath, outputPath);

    const buffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(inputPath, buffer);

    // Determine what to upload: watermarked or raw
    let uploadBuffer: Buffer;
    let uploadContentType = 'video/mp4';
    let uploadExt = 'mp4';

    // Resolve the creator username for watermark
    const username = creatorUsername || await getCreatorUsername(stream.creatorId);

    if (username) {
      try {
        // Ensure logo is available in /tmp
        const logoPath = join(tmp, 'digis-logo-white.png');
        await ensureLogoExists(logoPath);

        // Apply watermark with FFmpeg
        await applyWatermark({
          inputPath,
          outputPath,
          logoPath,
          username,
          maxDuration: 30,
        });

        uploadBuffer = await readFile(outputPath);
        console.log(`[CLIP] Watermarked clip: ${(uploadBuffer.length / 1024 / 1024).toFixed(1)}MB`);
      } catch (err) {
        console.warn('[CLIP] Watermark failed, uploading raw clip:', err);
        // Fall back to raw upload
        uploadBuffer = buffer;
        uploadContentType = videoFile.type;
        uploadExt = inputExt;
      }
    } else {
      // No username available, upload raw
      uploadBuffer = buffer;
      uploadContentType = videoFile.type;
      uploadExt = inputExt;
    }

    // Upload to Supabase Storage
    const bucket = 'recordings';
    const fileName = `${user.id}/clips/${Date.now()}-${Math.random().toString(36).substring(7)}.${uploadExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, uploadBuffer, {
        cacheControl: '31536000',
        upsert: false,
        contentType: uploadContentType,
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
    const [clip] = await db.insert(clips).values({
      creatorId: stream.creatorId,
      streamId: streamId,
      vodId: null,
      title,
      description: 'Clipped live by creator',
      videoUrl: publicUrl,
      duration: Math.min(duration, 30),
      startTime: 0,
      isPublic: true,
    }).returning();

    // Update creator's storage usage
    await db.update(users)
      .set({
        storageUsed: sql`${users.storageUsed} + ${uploadBuffer.length}`,
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
      { error: 'Failed to create clip' },
      { status: 500 }
    );
  } finally {
    // Clean up temp files
    for (const f of tmpFiles) {
      unlink(f).catch(() => {});
    }
  }
}

/** Look up the creator's username from the database */
async function getCreatorUsername(creatorId: string): Promise<string | null> {
  const creator = await db.query.users.findFirst({
    where: eq(users.id, creatorId),
    columns: { username: true },
  });
  return creator?.username || null;
}

/** Download the Digis logo to /tmp if not already cached */
async function ensureLogoExists(logoPath: string): Promise<void> {
  try {
    await access(logoPath);
    return; // Already exists
  } catch {
    // Need to download
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || 'https://digis.cc';
  const logoUrl = `${appUrl}/images/digis-logo-white.png`;

  const response = await fetch(logoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download logo: ${response.status}`);
  }

  const buf = Buffer.from(await response.arrayBuffer());
  await writeFile(logoPath, buf);
}
