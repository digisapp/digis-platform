import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { referrals } from '@/db/schema/referrals';
import { eq } from 'drizzle-orm';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

// PATCH /api/admin/referrals/[id] - Update a referral's status or revenue share
export const PATCH = withAdminParams<{ id: string }>(async ({ request, params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, revenueSharePercent, revenueShareExpiresAt } = body;

    const validStatuses = ['pending', 'active', 'expired', 'churned'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await db.query.referrals.findFirst({ where: eq(referrals.id, id) });
    if (!existing) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'active' && !existing.activatedAt) {
        updateData.activatedAt = new Date();
      }
    }

    if (revenueSharePercent !== undefined) {
      const pct = parseFloat(revenueSharePercent);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: 'revenueSharePercent must be between 0 and 100' }, { status: 400 });
      }
      updateData.revenueSharePercent = String(pct.toFixed(2));
    }

    if (revenueShareExpiresAt !== undefined) {
      updateData.revenueShareExpiresAt = revenueShareExpiresAt ? new Date(revenueShareExpiresAt) : null;
    }

    const [updated] = await db
      .update(referrals)
      .set(updateData)
      .where(eq(referrals.id, id))
      .returning();

    return NextResponse.json({ referral: updated });
  } catch (error) {
    console.error('[ADMIN REFERRALS PATCH]', error);
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 });
  }
});
