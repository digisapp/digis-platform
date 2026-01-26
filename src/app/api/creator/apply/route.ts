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

    const body = await request.json();
    const {
      fullName,
      instagramHandle,
      followerCount,
      ageConfirmed,
      termsAccepted,
    } = body;

    // Validate required fields before transaction
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

    // SECURITY: Use transaction to prevent race condition where two concurrent
    // requests could both pass the pending check and create duplicate applications
    const application = await db.transaction(async (tx) => {
      // Check if user already has a pending application INSIDE transaction
      // Note: Using query builder syntax since relational API doesn't work in transactions
      const existingApplications = await tx
        .select({ id: creatorApplications.id })
        .from(creatorApplications)
        .where(
          and(
            eq(creatorApplications.userId, user.id),
            eq(creatorApplications.status, 'pending')
          )
        )
        .limit(1);

      if (existingApplications.length > 0) {
        throw new Error(`DUPLICATE:${existingApplications[0].id}`);
      }

      // Create the application
      const [newApp] = await tx.insert(creatorApplications).values({
        userId: user.id,
        displayName: fullName.trim(),
        instagramHandle: instagramHandle.trim(),
        followerCount: String(followerCount),
        ageConfirmed: true,
        termsAccepted: true,
        status: 'pending',
      }).returning();

      return newApp;
    });

    console.log(`[Creator Application] New application submitted: ${user.id} - @${instagramHandle}`);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully! We will review it shortly.',
      applicationId: application.id,
    });
  } catch (error: any) {
    // Handle duplicate application error from transaction
    if (error.message?.startsWith('DUPLICATE:')) {
      const existingId = error.message.split(':')[1];
      return NextResponse.json(
        { error: 'You already have a pending application', applicationId: existingId },
        { status: 400 }
      );
    }

    console.error('Error submitting creator application:', error?.message || error, error?.stack);
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
        displayName: application.displayName,
        instagramHandle: application.instagramHandle,
        followerCount: application.followerCount,
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
