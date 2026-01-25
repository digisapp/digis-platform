import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { db } from '@/lib/data/system';
import { users, creatorApplications } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

    // Start transaction-like operations
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Update application status
    await db.update(creatorApplications)
      .set({
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(creatorApplications.id, id));

    // 2. Update user role to creator
    await db.update(users)
      .set({
        role: 'creator',
        isCreatorVerified: false, // Not auto-verified, just approved as creator
        updatedAt: new Date(),
      })
      .where(eq(users.id, application.userId));

    // 3. Update Supabase auth metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(application.userId, {
        app_metadata: { role: 'creator' },
      });
    } catch (authError) {
      console.error('[Creator Application] Failed to update auth metadata:', authError);
    }

    // 4. Create default creator settings
    try {
      const { error: settingsError } = await adminClient
        .from('creator_settings')
        .insert({
          user_id: application.userId,
          message_rate: 25,
          call_rate_per_minute: 25,
          minimum_call_duration: 5,
          is_available_for_calls: false,
          voice_call_rate_per_minute: 15,
          minimum_voice_call_duration: 5,
          is_available_for_voice_calls: false,
        })
        .select()
        .single();

      if (settingsError && !settingsError.message?.includes('duplicate')) {
        console.error('[Creator Application] Error creating creator settings:', settingsError);
      }
    } catch (settingsError) {
      console.error('[Creator Application] Error creating creator settings:', settingsError);
    }

    // 5. Create default AI Twin settings
    try {
      const { error: aiSettingsError } = await adminClient
        .from('ai_twin_settings')
        .insert({
          creator_id: application.userId,
          enabled: false,
          text_chat_enabled: false,
          voice: 'ara',
          price_per_minute: 20,
          minimum_minutes: 5,
          max_session_minutes: 60,
          text_price_per_message: 5,
        })
        .select()
        .single();

      if (aiSettingsError && !aiSettingsError.message?.includes('duplicate')) {
        console.error('[Creator Application] Error creating AI Twin settings:', aiSettingsError);
      }
    } catch (aiSettingsError) {
      console.error('[Creator Application] Error creating AI Twin settings:', aiSettingsError);
    }

    console.log(`[Creator Application] Approved: ${application.userId} by ${user.id}`);

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
