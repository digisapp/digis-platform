import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { socialShareSubmissions, rewardConfig } from '@/db/schema/rewards';
import { wallets } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/share-rewards/[id] - Approve or reject a submission
export const POST = withAdminParams<{ id: string }>(async ({ user, params, request }) => {
  try {
    const { id } = await params;
    const { action, rejectionReason } = await request.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Get the submission
    const submission = await db.query.socialShareSubmissions.findFirst({
      where: eq(socialShareSubmissions.id, id),
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Get reward amount from config
      const reward = await db.query.rewardConfig.findFirst({
        where: eq(rewardConfig.rewardType, submission.platform),
      });
      const coinsToAward = reward?.coinsAmount || 100;

      // Use transaction with row locking for wallet update
      await db.transaction(async (tx) => {
        // Lock the wallet row
        const lockedRows = await tx.execute(
          sql`SELECT * FROM wallets WHERE user_id = ${submission.creatorId} FOR UPDATE`
        );
        const creatorWallet = (lockedRows as unknown as Array<{ balance: number }>)[0];

        if (creatorWallet) {
          await tx.update(wallets)
            .set({
              balance: sql`${wallets.balance} + ${coinsToAward}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, submission.creatorId));
        } else {
          await tx.insert(wallets).values({
            userId: submission.creatorId,
            balance: coinsToAward,
          });
        }

        // Update submission
        await tx.update(socialShareSubmissions)
          .set({
            status: 'approved',
            coinsAwarded: coinsToAward,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(socialShareSubmissions.id, id));
      });

      return NextResponse.json({
        success: true,
        message: `Approved! ${coinsToAward} coins awarded to creator.`,
        coinsAwarded: coinsToAward,
      });
    } else {
      // Reject
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }

      await db.update(socialShareSubmissions)
        .set({
          status: 'rejected',
          rejectionReason,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(socialShareSubmissions.id, id));

      return NextResponse.json({
        success: true,
        message: 'Submission rejected.',
      });
    }
  } catch (error: any) {
    console.error('[ADMIN SHARE REWARDS] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to review submission' },
      { status: 500 }
    );
  }
});
