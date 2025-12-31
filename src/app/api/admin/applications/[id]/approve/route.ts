import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';
import { isAdminUser } from '@/lib/admin/check-admin';
import { sendCreatorApprovalEmail, addCreatorToAudience } from '@/lib/email/creator-notifications';
import { activateReferral } from '@/lib/referrals';
import { db } from '@/lib/data/system';
import { creatorApplications } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/admin/applications/[id]/approve - Approve application
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

    // Check if user is admin (email first, then DB)
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get the application to know the user ID
    const application = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.id, id),
      columns: { userId: true },
    });

    const result = await AdminService.approveApplication(id, user.id);

    // Activate referral if this user was referred (pays bonus to referrer)
    if (application?.userId) {
      activateReferral(application.userId).then(activationResult => {
        if (activationResult.success) {
          console.log(`[Application Approval] Referral activated, bonus paid: ${activationResult.bonusPaid} coins`);
        }
      }).catch(err => console.error('[Application Approval] Error activating referral:', err));
    }

    // Send approval email and add to creators audience (don't block on these)
    if (result.user?.email) {
      // Send approval email
      sendCreatorApprovalEmail({
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
      }).catch(err => console.error('Failed to send approval email:', err));

      // Add to creators audience for weekly emails
      addCreatorToAudience({
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
      }).catch(err => console.error('Failed to add to audience:', err));
    }

    return NextResponse.json({
      success: true,
      message: 'Application approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving application:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to approve application' },
      { status: 400 }
    );
  }
}
