import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContentService } from '@/lib/content/content-service';
import { db, users } from '@/lib/data/system';
import { eq, sql } from 'drizzle-orm';
import { validateBody, createContentSchema } from '@/lib/validation/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator and check storage quota
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true, storageUsed: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json(
        { error: 'Only creators can create content' },
        { status: 403 }
      );
    }

    const STORAGE_QUOTA = 2 * 1024 * 1024 * 1024; // 2GB
    if (dbUser.storageUsed >= STORAGE_QUOTA) {
      return NextResponse.json(
        { error: 'Storage limit reached (2GB). Delete old content to free space.' },
        { status: 413 }
      );
    }

    // Validate request body with Zod schema
    const validation = await validateBody(request, createContentSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      title,
      description,
      contentType,
      unlockPrice,
      thumbnailUrl,
      mediaUrl,
      durationSeconds,
      fileSize,
    } = validation.data;

    // Create content
    const content = await ContentService.createContent({
      creatorId: user.id,
      title,
      description,
      contentType,
      unlockPrice,
      thumbnailUrl,
      mediaUrl,
      durationSeconds,
    });

    // Track storage usage if file size is provided (for direct-to-storage uploads)
    if (fileSize && fileSize > 0) {
      await db.update(users)
        .set({
          storageUsed: sql`${users.storageUsed} + ${fileSize}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
}
