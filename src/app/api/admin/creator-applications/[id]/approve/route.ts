import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorApplications, creatorSettings, aiTwinSettings, creatorInvites } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/creator-applications/[id]/approve
 * Approve a creator application
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

    const body = await request.json().catch(() => ({}));
    const { adminNotes } = body;

    // Use a transaction for atomicity - all operations succeed or all fail
    // This prevents partial states like "approved but role not upgraded"
    await db.transaction(async (tx) => {
      // 1. Update application status
      await tx.update(creatorApplications)
        .set({
          status: 'approved',
          reviewedBy: user.id,
          reviewedAt: new Date(),
          adminNotes: adminNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(creatorApplications.id, id));

      // 2. Update user role to creator
      await tx.update(users)
        .set({
          role: 'creator',
          isCreatorVerified: false, // Not auto-verified, just approved as creator
          updatedAt: new Date(),
        })
        .where(eq(users.id, application.userId));

      // 3. Create default creator settings (using Drizzle in same transaction)
      await tx.insert(creatorSettings).values({
        userId: application.userId,
        messageRate: 3,
        callRatePerMinute: 25,
        minimumCallDuration: 5,
        isAvailableForCalls: false,
        voiceCallRatePerMinute: 15,
        minimumVoiceCallDuration: 5,
        isAvailableForVoiceCalls: false,
      }).onConflictDoNothing();

      // 4. Create default AI Twin settings (using Drizzle in same transaction)
      await tx.insert(aiTwinSettings).values({
        creatorId: application.userId,
        enabled: false,
        textChatEnabled: false,
        voice: 'ara',
        pricePerMinute: 20,
        minimumMinutes: 5,
        maxSessionMinutes: 60,
        textPricePerMessage: 5,
      }).onConflictDoNothing();
    });

    // 5. Update Supabase auth metadata (outside transaction - different system)
    // This is fire-and-forget; the DB is the source of truth
    try {
      await supabaseAdmin.auth.admin.updateUserById(application.userId, {
        app_metadata: { role: 'creator' },
      });
    } catch (authError) {
      console.error('[Creator Application] Failed to update auth metadata:', authError);
      // Don't fail the request - DB is the source of truth
    }

    console.log(`[Creator Application] Approved: ${application.userId} by ${user.id}`);

    // 6. Auto-link pending invite if Instagram handle matches
    // This handles the case where an invited creator signed up naturally instead of using the invite link
    if (application.instagramHandle) {
      const normalizedHandle = application.instagramHandle.toLowerCase().replace('@', '');
      try {
        const updatedInvites = await db.update(creatorInvites)
          .set({
            status: 'claimed',
            claimedBy: application.userId,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(creatorInvites.instagramHandle, normalizedHandle),
              eq(creatorInvites.status, 'pending')
            )
          )
          .returning({ id: creatorInvites.id });

        if (updatedInvites.length > 0) {
          console.log(`[Creator Application] Auto-linked pending invite for @${normalizedHandle} to user ${application.userId}`);
        }
      } catch (inviteError) {
        // Don't fail the approval if invite linking fails - it's a nice-to-have
        console.error('[Creator Application] Failed to auto-link invite:', inviteError);
      }
    }

    // TODO: Send approval email notification to user

    return NextResponse.json({
      success: true,
      message: 'Application approved successfully',
    });
  } catch (error: any) {
    console.error('Error approving creator application:', error);
    return NextResponse.json(
      { error: 'Failed to approve application' },
      { status: 500 }
    );
  }
}
