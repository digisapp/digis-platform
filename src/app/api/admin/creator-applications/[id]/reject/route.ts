import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { creatorApplications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/creator-applications/[id]/reject
 * Reject a creator application
 */
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

    // Check if user is admin
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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

    // TODO: Send rejection email notification to user with reason

    return NextResponse.json({
      success: true,
      message: 'Application rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting creator application:', error);
    return NextResponse.json(
      { error: 'Failed to reject application' },
      { status: 500 }
    );
  }
}
