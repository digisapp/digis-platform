import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorApplications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/creator/apply
 * Submit an application to become a creator
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Creator Application] Starting application submission...');

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[Creator Application] Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Creator Application] User authenticated:', user.id);

    // Check if user is already a creator using query builder (not relational API)
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    console.log('[Creator Application] User role check:', dbUser?.role);

    if (dbUser?.role === 'creator') {
      return NextResponse.json(
        { error: 'You are already a creator' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      instagramHandle,
      followerCount,
      ageConfirmed,
      termsAccepted,
    } = body;

    console.log('[Creator Application] Form data received:', { fullName, instagramHandle, followerCount, ageConfirmed, termsAccepted });

    // Validate required fields
    if (!fullName?.trim()) {
      return NextResponse.json(
        { error: 'Please enter your full name' },
        { status: 400 }
      );
    }

    if (!instagramHandle?.trim()) {
      return NextResponse.json(
        { error: 'Please enter your Instagram handle' },
        { status: 400 }
      );
    }

    if (!followerCount) {
      return NextResponse.json(
        { error: 'Please enter your follower count' },
        { status: 400 }
      );
    }

    if (!ageConfirmed) {
      return NextResponse.json(
        { error: 'You must confirm you are 18 or older' },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: 'You must accept the terms of service' },
        { status: 400 }
      );
    }

    // Check for existing pending application using query builder (not relational API)
    console.log('[Creator Application] Checking for existing pending application...');
    const existingApps = await db
      .select({ id: creatorApplications.id })
      .from(creatorApplications)
      .where(
        and(
          eq(creatorApplications.userId, user.id),
          eq(creatorApplications.status, 'pending')
        )
      )
      .limit(1);

    console.log('[Creator Application] Existing apps check result:', existingApps);

    if (existingApps.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending application', applicationId: existingApps[0].id },
        { status: 400 }
      );
    }

    // Create the application
    console.log('[Creator Application] Creating new application...');
    const [application] = await db.insert(creatorApplications).values({
      userId: user.id,
      displayName: fullName.trim(),
      instagramHandle: instagramHandle.trim(),
      followerCount: String(followerCount),
      bio: '', // Required field - provide empty string as default
      ageConfirmed: true,
      termsAccepted: true,
      status: 'pending',
    }).returning();

    console.log(`[Creator Application] Success! Application ID: ${application.id} for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully! We will review it shortly.',
      applicationId: application.id,
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
      console.log('[Creator Application] Duplicate application detected');
      return NextResponse.json(
        { error: 'You already have a pending application' },
        { status: 400 }
      );
    }

    console.error('[Creator Application] ERROR:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    });
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

    // Get user's most recent application using query builder (not relational API)
    const applications = await db
      .select({
        id: creatorApplications.id,
        status: creatorApplications.status,
        displayName: creatorApplications.displayName,
        instagramHandle: creatorApplications.instagramHandle,
        followerCount: creatorApplications.followerCount,
        rejectionReason: creatorApplications.rejectionReason,
        createdAt: creatorApplications.createdAt,
        reviewedAt: creatorApplications.reviewedAt,
      })
      .from(creatorApplications)
      .where(eq(creatorApplications.userId, user.id))
      .orderBy(desc(creatorApplications.createdAt))
      .limit(1);

    if (applications.length === 0) {
      return NextResponse.json({ hasApplication: false, application: null });
    }

    return NextResponse.json({
      hasApplication: true,
      application: applications[0],
    });
  } catch (error: any) {
    console.error('Error fetching application status:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Failed to fetch application status' },
      { status: 500 }
    );
  }
}
