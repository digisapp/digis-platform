import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { pageViews } from '@/db/schema/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Detect device type from user agent
function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(ua)) {
    return 'mobile';
  }
  if (/ipad|tablet|playbook|silk/.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

// Determine page type from path
function getPageType(path: string): string {
  if (path === '/' || path === '') return 'home';
  if (path.startsWith('/explore')) return 'explore';
  if (path.startsWith('/stream/')) return 'stream';
  if (path.startsWith('/live')) return 'live';
  if (path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/wallet')) return 'wallet';
  if (path.startsWith('/chats')) return 'chats';
  if (path.startsWith('/creator/')) return 'creator_dashboard';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/subscriptions')) return 'subscriptions';
  // Profile pages are /{username} - single segment paths that aren't reserved
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1 && !['explore', 'live', 'settings', 'wallet', 'chats', 'admin', 'subscriptions', 'streams', 'content', 'connections'].includes(segments[0])) {
    return 'profile';
  }
  return 'other';
}

// POST /api/track/pageview - Track a page view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, referrer, visitorId, creatorUsername } = body;

    if (!path) {
      return NextResponse.json({ error: 'Path required' }, { status: 400 });
    }

    // Get user if logged in
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Not logged in, that's fine
    }

    const userAgent = request.headers.get('user-agent') || '';
    const device = getDeviceType(userAgent);
    const pageType = getPageType(path);

    // For profile pages, extract creator info
    let creatorId: string | null = null;
    let creatorUsernameValue: string | null = null;

    if (pageType === 'profile' && creatorUsername) {
      creatorUsernameValue = creatorUsername;
      // We could look up creatorId here, but for performance we'll skip it
      // The creatorUsername is enough for aggregation queries
    }

    // Insert page view (fire and forget for performance)
    await db.insert(pageViews).values({
      path,
      pageType,
      creatorId,
      creatorUsername: creatorUsernameValue,
      visitorId: visitorId || null,
      userId,
      referrer: referrer || null,
      userAgent: userAgent.substring(0, 500), // Limit length
      device,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Track Pageview] Error:', error);
    // Don't fail the request - tracking errors shouldn't break the site
    return NextResponse.json({ success: false });
  }
}
