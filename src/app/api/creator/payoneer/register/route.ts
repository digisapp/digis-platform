import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateRegistrationLink, isPayoneerConfigured } from '@/lib/payoneer/service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/creator/payoneer/register
 *
 * Generate a registration link for a creator to connect their Payoneer account
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const profileResponse = await fetch(new URL('/api/user/profile', request.url), {
      headers: { cookie: request.headers.get('cookie') || '' }
    });
    const profile = await profileResponse.json();

    if (profile.user?.role !== 'creator') {
      return NextResponse.json(
        { error: 'Only creators can connect Payoneer accounts' },
        { status: 403 }
      );
    }

    // Check if Payoneer is configured
    if (!isPayoneerConfigured()) {
      return NextResponse.json(
        { error: 'Payoneer is not configured on this platform' },
        { status: 503 }
      );
    }

    // Generate registration link
    const result = await generateRegistrationLink(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate registration link' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      registrationLink: result.registrationLink,
      expiresAt: result.expiresAt?.toISOString(),
    });
  } catch (error) {
    console.error('Error generating Payoneer registration link:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration link. Please try again.' },
      { status: 500 }
    );
  }
}
