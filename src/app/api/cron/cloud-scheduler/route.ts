import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { db } from '@/lib/data/system';
import { cloudScheduledDrops, cloudItems, cloudCreatorStreaks } from '@/lib/data/system';
import { eq, and, lte, sql } from 'drizzle-orm';
import { NotificationService } from '@/lib/services/notification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * GET - Process scheduled Drops drops (called by Vercel Cron)
 * Publishes all drops where scheduledFor <= now and status = 'scheduled'
 * Updates creator streaks
 * Sends fan notifications
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    const expectedHeader = `Bearer ${cronSecret}`;
    if (!authHeader || !secureCompare(authHeader, expectedHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const now = new Date();

    // Find all drops due for publishing
    const dueDrops = await db.select()
      .from(cloudScheduledDrops)
      .where(and(
        eq(cloudScheduledDrops.status, 'scheduled'),
        lte(cloudScheduledDrops.scheduledFor, now),
      ));

    let published = 0;
    let errors = 0;
    const creatorsUpdated = new Set<string>();

    for (const drop of dueDrops) {
      try {
        // Get the item
        const item = await db.query.cloudItems.findFirst({
          where: eq(cloudItems.id, drop.itemId),
        });

        if (!item) {
          // Item was deleted, cancel the drop
          await db.update(cloudScheduledDrops)
            .set({ status: 'cancelled' })
            .where(eq(cloudScheduledDrops.id, drop.id));
          continue;
        }

        // Publish the item (set to live)
        await db.update(cloudItems)
          .set({
            status: 'live',
            publishedAt: now,
          })
          .where(eq(cloudItems.id, drop.itemId));

        // Mark drop as published
        await db.update(cloudScheduledDrops)
          .set({
            status: 'published',
            publishedAt: now,
          })
          .where(eq(cloudScheduledDrops.id, drop.id));

        creatorsUpdated.add(drop.creatorId);
        published++;

        // Notify fans (fire-and-forget)
        NotificationService.notifyFollowersOfDrop(drop.creatorId, item).catch(err => {
          console.error('[CRON CLOUD] Notification error:', err.message);
        });

      } catch (err: any) {
        console.error('[CRON CLOUD] Error publishing drop:', { dropId: drop.id, error: err.message });
        errors++;
      }
    }

    // Update streaks for all creators who had drops published today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const creatorId of creatorsUpdated) {
      try {
        const existing = await db.query.cloudCreatorStreaks.findFirst({
          where: eq(cloudCreatorStreaks.creatorId, creatorId),
        });

        if (existing) {
          const lastActive = existing.lastActiveDate ? new Date(existing.lastActiveDate) : null;
          lastActive?.setHours(0, 0, 0, 0);

          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          let newStreak = existing.currentStreak;

          if (lastActive && lastActive.getTime() === yesterday.getTime()) {
            // Consecutive day — increment streak
            newStreak = existing.currentStreak + 1;
          } else if (!lastActive || lastActive.getTime() < yesterday.getTime()) {
            // Streak broken — restart at 1
            newStreak = 1;
          }
          // If lastActive === today, streak already counted — skip

          if (!lastActive || lastActive.getTime() !== today.getTime()) {
            await db.update(cloudCreatorStreaks)
              .set({
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, existing.longestStreak),
                lastActiveDate: now,
                updatedAt: now,
              })
              .where(eq(cloudCreatorStreaks.creatorId, creatorId));
          }
        } else {
          // First time — create streak record
          await db.insert(cloudCreatorStreaks).values({
            creatorId,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDate: now,
          });
        }
      } catch (err: any) {
        console.error('[CRON CLOUD] Streak update error:', { creatorId, error: err.message });
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      published,
      errors,
      creatorsUpdated: creatorsUpdated.size,
      duration: `${duration}ms`,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('[CRON CLOUD ERROR]', { error: error.message });
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
