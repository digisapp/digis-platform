import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { db } from '@/lib/data/system';
import { users, creatorApplications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/creator/apply
 * Submit an application to become a creator
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is already a creator
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (dbUser?.role === 'creator') {
      return NextResponse.json(
        { error: 'You are already a creator' },
        { status: 400 }
      );
    }

    // Check if user already has a pending application
    const existingApplication = await db.query.creatorApplications.findFirst({
      where: and(
        eq(creatorApplications.userId, user.id),
        eq(creatorApplications.status, 'pending')
      ),
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You already have a pending application', applicationId: existingApplication.id },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      instagramHandle,
      tiktokHandle,
      otherSocialLinks,
      followerCount,
      contentCategory,
      bio,
    } = body;

    // Validate required fields
    if (!contentCategory) {
      return NextResponse.json(
        { error: 'Please select a content category' },
        { status: 400 }
      );
    }

    // Create the application
    const [application] = await db.insert(creatorApplications).values({
      userId: user.id,
      instagramHandle: instagramHandle?.trim() || null,
      tiktokHandle: tiktokHandle?.trim() || null,
      otherSocialLinks: otherSocialLinks ? JSON.stringify(otherSocialLinks) : null,
      followerCount,
      contentCategory,
      bio: bio?.trim() || null,
      status: 'pending',
    }).returning();

    console.log(`[Creator Application] New application submitted: ${user.id} - ${contentCategory}`);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully! We will review it shortly.',
      applicationId: application.id,
    });
  } catch (error: any) {
    console.error('Error submitting creator application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/creator/apply
 * Get the current user's application status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's most recent application
    const application = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.userId, user.id),
      orderBy: [desc(creatorApplications.createdAt)],
    });

    if (!application) {
      return NextResponse.json({ hasApplication: false, application: null });
    }

    return NextResponse.json({
      hasApplication: true,
      application: {
        id: application.id,
        status: application.status,
        instagramHandle: application.instagramHandle,
        tiktokHandle: application.tiktokHandle,
        contentCategory: application.contentCategory,
        followerCount: application.followerCount,
        bio: application.bio,
        rejectionReason: application.rejectionReason,
        createdAt: application.createdAt,
        reviewedAt: application.reviewedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching application status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application status' },
      { status: 500 }
    );
  }
}
