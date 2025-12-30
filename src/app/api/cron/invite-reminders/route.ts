import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorInvites } from '@/db/schema';
import { eq, and, isNull, isNotNull, lt } from 'drizzle-orm';
import { sendInviteReminder } from '@/lib/email/creator-invite-campaign';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Timing-safe string comparison
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// GET - Send reminder emails for unclaimed invites (called by Vercel Cron)
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[Cron:Reminders] CRON_SECRET not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    const expectedHeader = `Bearer ${cronSecret}`;

    if (!authHeader || !secureCompare(authHeader, expectedHeader)) {
      console.error('[Cron:Reminders] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron:Reminders] Starting invite reminder processing...');
    const startTime = Date.now();

    // Find pending invites that:
    // - Are still pending
    // - Have an email
    // - Were created more than 3 days ago
    // - Haven't had a reminder sent yet
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const pendingInvites = await db.query.creatorInvites.findMany({
      where: and(
        eq(creatorInvites.status, 'pending'),
        isNotNull(creatorInvites.email),
        isNull(creatorInvites.reminderSentAt),
        lt(creatorInvites.createdAt, threeDaysAgo)
      ),
      columns: {
        id: true,
        email: true,
        instagramHandle: true,
        displayName: true,
        code: true,
      },
      limit: 50, // Process max 50 per run to stay within time limits
    });

    console.log(`[Cron:Reminders] Found ${pendingInvites.length} invites needing reminders`);

    let sent = 0;
    let failed = 0;

    for (const invite of pendingInvites) {
      if (!invite.email) continue;

      const inviteUrl = `https://digis.cc/claim/${invite.code}`;
      const result = await sendInviteReminder({
        email: invite.email,
        name: invite.displayName || invite.instagramHandle,
        inviteUrl,
      });

      if (result.success) {
        // Mark reminder as sent
        await db
          .update(creatorInvites)
          .set({
            reminderSentAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(creatorInvites.id, invite.id));
        sent++;
      } else {
        console.error(`[Cron:Reminders] Failed to send to ${invite.email}:`, result.error);
        failed++;
      }

      // Small delay between emails to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;

    console.log(`[Cron:Reminders] Completed in ${duration}ms: sent=${sent}, failed=${failed}`);

    return NextResponse.json({
      success: true,
      processed: pendingInvites.length,
      sent,
      failed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron:Reminders] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
