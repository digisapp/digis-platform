import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContentService } from '@/lib/content/content-service';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
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

    // Verify user is a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json(
        { error: 'Only creators can create content' },
        { status: 403 }
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

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create content' },
      { status: 500 }
    );
  }
}
