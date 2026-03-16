import { NextResponse } from 'next/server';
import { db, payoutRequests } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { submitPayout, checkPayoutStatus } from '@/lib/payoneer/service';
import { z } from 'zod';
import { withAdmin } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const processPayoneerSchema = z.object({
  payoutId: z.string().uuid(),
  action: z.enum(['submit', 'check_status']).default('submit'),
});

/**
 * POST /api/admin/payouts/process-payoneer
 *
 * One-click Payoneer payout processing for admins
 * - submit: Submit a pending payout to Payoneer API
 * - check_status: Check the status of an existing Payoneer payout
 */
export const POST = withAdmin(async ({ request }) => {
  try {
    const body = await request.json();
    const validation = processPayoneerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { payoutId, action } = validation.data;

    const payout = await db.query.payoutRequests.findFirst({
      where: eq(payoutRequests.id, payoutId),
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }

    if (payout.payoutMethod !== 'payoneer') {
      return NextResponse.json(
        { error: 'This payout is not configured for Payoneer' },
        { status: 400 }
      );
    }

    if (action === 'submit') {
      if (payout.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot submit payout with status: ${payout.status}` },
          { status: 400 }
        );
      }

      const result = await submitPayout(payoutId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to submit payout to Payoneer' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payout submitted to Payoneer',
        paymentId: result.paymentId,
        status: result.status,
      });
    } else if (action === 'check_status') {
      if (!payout.payoneerPaymentId) {
        return NextResponse.json(
          { error: 'Payout has not been submitted to Payoneer yet' },
          { status: 400 }
        );
      }

      const result = await checkPayoutStatus(payoutId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to check payout status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        paymentId: result.paymentId,
        status: result.status,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[ADMIN PAYONEER] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to process payout. Please try again.' },
      { status: 500 }
    );
  }
});
