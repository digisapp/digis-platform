import { NextRequest, NextResponse } from 'next/server';
import { db, vods } from '@/lib/data/system';
import { eq, and, lt, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This should be called by a cron job daily
// Can be triggered by Vercel Cron or external service

const UNPURCHASED_DAYS = 60; // Delete recordings with 0 purchases after 60 days
const DRAFT_DAYS = 7; // Delete draft recordings after 7 days

export async function POST(request: NextRequest) {
  try {
    // Verify this is called by authorized source (cron secret or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();
    const unpurchasedCutoff = new Date(now.getTime() - UNPURCHASED_DAYS * 24 * 60 * 60 * 1000);
    const draftCutoff = new Date(now.getTime() - DRAFT_DAYS * 24 * 60 * 60 * 1000);

    // Find recordings to delete:
    // 1. Unpurchased recordings older than 60 days
    const unpurchasedRecordings = await db.query.vods.findMany({
      where: and(
        eq(vods.purchaseCount, 0),
        eq(vods.recordingType, 'manual'),
        eq(vods.isDraft, false),
        lt(vods.createdAt, unpurchasedCutoff)
      ),
      columns: {
        id: true,
        videoUrl: true,
        thumbnailUrl: true,
        creatorId: true,
        title: true,
      },
    });

    // 2. Expired draft recordings
    const expiredDrafts = await db.query.vods.findMany({
      where: and(
        eq(vods.isDraft, true),
        lt(vods.createdAt, draftCutoff)
      ),
      columns: {
        id: true,
        videoUrl: true,
        thumbnailUrl: true,
        creatorId: true,
        title: true,
      },
    });

    const toDelete = [...unpurchasedRecordings, ...expiredDrafts];

    if (toDelete.length === 0) {
      return NextResponse.json({
        message: 'No recordings to cleanup',
        deleted: 0,
      });
    }

    // Delete from storage and database
    let deletedCount = 0;
    const errors: string[] = [];

    for (const recording of toDelete) {
      try {
        // Extract file path from URL for storage deletion
        if (recording.videoUrl) {
          const urlParts = recording.videoUrl.split('/recordings/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage.from('recordings').remove([filePath]);
          }
        }

        // Delete from database
        await db.delete(vods).where(eq(vods.id, recording.id));
        deletedCount++;

        console.log(`[CLEANUP] Deleted recording: ${recording.id} (${recording.title})`);
      } catch (err) {
        console.error(`[CLEANUP] Error deleting recording ${recording.id}:`, err);
        errors.push(`Failed to delete ${recording.id}: ${err}`);
      }
    }

    return NextResponse.json({
      message: `Cleanup completed`,
      deleted: deletedCount,
      unpurchased: unpurchasedRecordings.length,
      drafts: expiredDrafts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[RECORDINGS CLEANUP ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check what would be deleted (dry run)
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const unpurchasedCutoff = new Date(now.getTime() - UNPURCHASED_DAYS * 24 * 60 * 60 * 1000);
    const draftCutoff = new Date(now.getTime() - DRAFT_DAYS * 24 * 60 * 60 * 1000);

    // Find recordings that would be deleted
    const unpurchasedRecordings = await db.query.vods.findMany({
      where: and(
        eq(vods.purchaseCount, 0),
        eq(vods.recordingType, 'manual'),
        eq(vods.isDraft, false),
        lt(vods.createdAt, unpurchasedCutoff)
      ),
      columns: {
        id: true,
        title: true,
        creatorId: true,
        createdAt: true,
      },
    });

    const expiredDrafts = await db.query.vods.findMany({
      where: and(
        eq(vods.isDraft, true),
        lt(vods.createdAt, draftCutoff)
      ),
      columns: {
        id: true,
        title: true,
        creatorId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      dryRun: true,
      wouldDelete: {
        unpurchasedRecordings: unpurchasedRecordings.length,
        expiredDrafts: expiredDrafts.length,
        total: unpurchasedRecordings.length + expiredDrafts.length,
      },
      details: {
        unpurchased: unpurchasedRecordings,
        drafts: expiredDrafts,
      },
      cutoffs: {
        unpurchasedDays: UNPURCHASED_DAYS,
        draftDays: DRAFT_DAYS,
        unpurchasedCutoff: unpurchasedCutoff.toISOString(),
        draftCutoff: draftCutoff.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[RECORDINGS CLEANUP CHECK ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Check failed' },
      { status: 500 }
    );
  }
}
