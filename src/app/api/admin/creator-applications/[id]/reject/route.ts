import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorApplications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/creator-applications/[id]/reject
 * Reject a creator application
 */
export const POST = withAdminParams<{ id: string }>(async ({ user, params, request }) => {
  const { id } = await params;

  // Get the application
  const application = await db.query.creatorApplications.findFirst({
    where: eq(creatorApplications.id, id),
  });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (application.status !== 'pending') {
    return NextResponse.json(
      { error: `Application has already been ${application.status}` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { rejectionReason, adminNotes } = body;

  if (!rejectionReason) {
    return NextResponse.json(
      { error: 'Please provide a reason for rejection' },
      { status: 400 }
    );
  }

  // Update application status
  await db.update(creatorApplications)
    .set({
      status: 'rejected',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      rejectionReason,
      adminNotes: adminNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(creatorApplications.id, id));

  console.log(`[Creator Application] Rejected: ${application.userId} by ${user.id} - Reason: ${rejectionReason}`);

  return NextResponse.json({
    success: true,
    message: 'Application rejected',
  });
});
