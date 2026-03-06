import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/data/system';
import { aiTwinSettings, contentItems, vodTranscripts, messages } from '@/db/schema';
import { eq, and, gt, isNotNull } from 'drizzle-orm';
import { XaiCollectionsService } from '@/lib/services/xai-collections-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * GET /api/cron/sync-collections
 * Daily cron: re-sync creators who have new content/streams since last sync
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[Cron SyncCollections] CRON_SECRET not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !secureCompare(authHeader, `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron SyncCollections] Starting...');
    const startTime = Date.now();

    // Get all creators who have synced at least once (have a collection)
    const creatorsWithCollections = await db.query.aiTwinSettings.findMany({
      where: and(
        isNotNull(aiTwinSettings.xaiCollectionId),
        isNotNull(aiTwinSettings.collectionSyncedAt)
      ),
      columns: {
        creatorId: true,
        collectionSyncedAt: true,
      },
    });

    if (creatorsWithCollections.length === 0) {
      console.log('[Cron SyncCollections] No creators with collections, skipping');
      return NextResponse.json({ synced: 0, skipped: 0, errors: 0 });
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const creator of creatorsWithCollections) {
      const lastSync = creator.collectionSyncedAt!;

      try {
        // Check if creator has new data since last sync
        const [newTranscripts, newContent, newMessages] = await Promise.all([
          db.query.vodTranscripts.findFirst({
            where: and(
              eq(vodTranscripts.creatorId, creator.creatorId),
              eq(vodTranscripts.status, 'completed'),
              gt(vodTranscripts.createdAt, lastSync)
            ),
            columns: { id: true },
          }),
          db.query.contentItems.findFirst({
            where: and(
              eq(contentItems.creatorId, creator.creatorId),
              eq(contentItems.isPublished, true),
              gt(contentItems.createdAt, lastSync)
            ),
            columns: { id: true },
          }),
          db.query.messages.findFirst({
            where: and(
              eq(messages.senderId, creator.creatorId),
              eq(messages.isAiGenerated, false),
              gt(messages.createdAt, lastSync)
            ),
            columns: { id: true },
          }),
        ]);

        const hasNewData = !!(newTranscripts || newContent || newMessages);

        if (!hasNewData) {
          skipped++;
          continue;
        }

        const result = await XaiCollectionsService.syncCreatorData(creator.creatorId);
        if (result.success) {
          synced++;
          console.log(`[Cron SyncCollections] Synced ${creator.creatorId} (${result.documentCount} docs)`);
        } else {
          errors++;
          console.error(`[Cron SyncCollections] Failed for ${creator.creatorId}: ${result.error}`);
        }
      } catch (err: any) {
        errors++;
        console.error(`[Cron SyncCollections] Error for ${creator.creatorId}:`, err?.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron SyncCollections] Done in ${duration}ms: synced=${synced}, skipped=${skipped}, errors=${errors}`);

    return NextResponse.json({ synced, skipped, errors, duration });
  } catch (error: any) {
    console.error('[Cron SyncCollections] Fatal error:', error?.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
