import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AdminService } from '@/lib/admin/admin-service';
import { isAdminUser } from '@/lib/admin/check-admin';

// GET /api/admin/applications - Get all applications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (email first, then DB)
    if (!await isAdminUser(user)) {
      console.log('[ADMIN/APPLICATIONS] Access denied for:', user.email);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const applications = await AdminService.getAllApplications(
      status || undefined,
      limit,
      offset
    );

    console.log('[API] Raw applications from DB:', JSON.stringify(applications, null, 2));
    console.log('[API] Number of applications:', applications.length);

    // Transform snake_case to camelCase for frontend
    const transformedApplications = applications.map((app: any) => ({
      id: app.id,
      displayName: app.display_name,
      bio: app.bio,
      contentType: app.content_type,
      whyCreator: app.why_creator,
      status: app.status,
      createdAt: app.created_at,
      instagramHandle: app.instagram_handle,
      twitterHandle: app.twitter_handle,
      website: app.website,
      user: {
        id: app.user?.id,
        email: app.user?.email,
        username: app.user?.username,
        avatarUrl: app.user?.avatar_url,
        createdAt: app.user?.created_at,
      },
    }));

    return NextResponse.json({ applications: transformedApplications });
  } catch (error: any) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
