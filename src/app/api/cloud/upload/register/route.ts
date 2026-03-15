import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, cloudItems } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Register an uploaded file as a Drops item
 * Called after client uploads directly to Supabase Storage
 * Idempotent by storagePath — safe to retry
 *
 * Body: { storagePath, type, sizeBytes, durationSeconds? }
 * Returns: { item, processingStatus: 'queued' }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can register items' }, { status: 403 });
    }

    const body = await request.json();
    const { storagePath, type, sizeBytes, durationSeconds } = body;

    if (!storagePath || !type || !sizeBytes) {
      return NextResponse.json({ error: 'storagePath, type, and sizeBytes required' }, { status: 400 });
    }

    if (!['photo', 'video'].includes(type)) {
      return NextResponse.json({ error: 'type must be photo or video' }, { status: 400 });
    }

    // Verify the path belongs to this user
    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 403 });
    }

    // Idempotency: check if item already registered for this storage path
    const { data: { publicUrl } } = supabase.storage.from('content').getPublicUrl(storagePath);

    const existing = await db.query.cloudItems.findFirst({
      where: and(
        eq(cloudItems.creatorId, user.id),
        eq(cloudItems.fileUrl, publicUrl),
      ),
    });

    if (existing) {
      // Already registered — return existing item (idempotent)
      return NextResponse.json({
        item: existing,
        processingStatus: existing.thumbnailUrl && existing.thumbnailUrl !== publicUrl ? 'done' : 'queued',
        duplicate: true,
      });
    }

    // Verify file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('content')
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        search: storagePath.split('/').pop(),
      });

    if (fileError || !fileData || fileData.length === 0) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Create drops item — starts as private, thumbnailUrl = original for now
    const [item] = await db.insert(cloudItems).values({
      creatorId: user.id,
      fileUrl: publicUrl,
      thumbnailUrl: publicUrl, // Will be replaced by background processing
      type,
      durationSeconds: type === 'video' ? (durationSeconds || null) : null,
      sizeBytes,
      status: 'private',
    }).returning();

    // Update creator's storage usage
    await db.update(users)
      .set({
        storageUsed: sql`${users.storageUsed} + ${sizeBytes}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Trigger background thumbnail processing (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    fetch(`${baseUrl}/api/cloud/upload/process-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id, storagePath, type }),
    }).catch(err => {
      console.error('[CLOUD REGISTER] Failed to trigger processing:', err.message);
    });

    return NextResponse.json({
      item,
      processingStatus: 'queued',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[CLOUD REGISTER ERROR]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
