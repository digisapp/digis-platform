import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { creatorApplications } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/creator/apply - Submit creator application
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      displayName,
      bio,
      instagramHandle,
      twitterHandle,
      website,
      whyCreator,
      contentType,
    } = body;

    // Validate required fields
    if (!displayName || !bio || !whyCreator || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has a pending/approved application
    const existing = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.userId, user.id),
    });

    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending application' },
          { status: 400 }
        );
      }
      if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already a creator' },
          { status: 400 }
        );
      }
      // If rejected, they can reapply - delete old application
      await db.delete(creatorApplications).where(eq(creatorApplications.userId, user.id));
    }

    // Create new application
    await db.insert(creatorApplications).values({
      userId: user.id,
      displayName,
      bio,
      instagramHandle,
      twitterHandle,
      website,
      whyCreator,
      contentType,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully! We will review it soon.',
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

// GET /api/creator/apply - Get user's application status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const application = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.userId, user.id),
    });

    return NextResponse.json({ application });
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}
