import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { socialShareSubmissions, rewardConfig } from '@/db/schema/rewards';
import { users, wallets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/share-rewards/[id] - Approve or reject a submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: 'Submission has already been reviewed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Get reward amount from config
      const reward = await db.query.rewardConfig.findFirst({
        where: eq(rewardConfig.rewardType, submission.platform),
      });
      const coinsToAward = reward?.coinsAmount || 100;

      // Award coins to creator
      const creatorWallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, submission.creatorId),
      });

      if (creatorWallet) {
        await db.update(wallets)
          .set({
            balance: creatorWallet.balance + coinsToAward,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, submission.creatorId));
      } else {
        // Create wallet if doesn't exist
        await db.insert(wallets).values({
          userId: submission.creatorId,
          balance: coinsToAward,
        });
      }

      // Update submission
      await db.update(socialShareSubmissions)
        .set({
          status: 'approved',
          coinsAwarded: coinsToAward,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(socialShareSubmissions.id, id));

      return NextResponse.json({
        success: true,
        message: `Approved! ${coinsToAward} coins awarded to creator.`,
        coinsAwarded: coinsToAward,
      });
    } else {
      // Reject
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        );
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
    console.error('Error reviewing submission:', error);
    return NextResponse.json(
      { error: 'Failed to review submission' },
      { status: 500 }
    );
  }
}
