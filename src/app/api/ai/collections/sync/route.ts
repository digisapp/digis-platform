import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, aiTwinSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { XaiCollectionsService } from '@/lib/services/xai-collections-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/collections/sync
 * Sync creator's data to xAI collection for RAG search
 * Rate limited: 1 sync per 5 minutes
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify creator role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can sync collections' }, { status: 403 });
    }

    // Check rate limit: 1 sync per 5 minutes
    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, user.id),
      columns: { collectionSyncedAt: true },
    });

    if (settings?.collectionSyncedAt) {
      const timeSinceSync = Date.now() - new Date(settings.collectionSyncedAt).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      if (timeSinceSync < fiveMinutes) {
        const waitSeconds = Math.ceil((fiveMinutes - timeSinceSync) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before syncing again` },
          { status: 429 }
        );
      }
    }

    // Perform sync
    const result = await XaiCollectionsService.syncCreatorData(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentCount: result.documentCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AI Collections Sync] Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync collection' },
      { status: 500 }
    );
  }
}
