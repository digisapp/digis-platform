import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Use Supabase admin client for database operations
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already has a pending/approved application
    const { data: existing } = await adminClient
      .from('creator_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();

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
      await adminClient
        .from('creator_applications')
        .delete()
        .eq('user_id', user.id);
    }

    // Create new application
    const { error: insertError } = await adminClient
      .from('creator_applications')
      .insert({
        user_id: user.id,
        display_name: displayName,
        bio,
        instagram_handle: instagramHandle,
        twitter_handle: twitterHandle,
        website,
        why_creator: whyCreator,
        content_type: contentType,
        status: 'pending',
      });

    if (insertError) {
      throw insertError;
    }

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

    // Use Supabase admin client
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: application } = await adminClient
      .from('creator_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ application });
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}
