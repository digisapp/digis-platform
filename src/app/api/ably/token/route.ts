import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import Ably from 'ably';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate Ably token for authenticated users
 * This endpoint is called by the Ably client SDK to get auth tokens
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit to prevent token flooding
    const rateLimitResult = await rateLimit(req, 'ably:token');
    if (!rateLimitResult.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      console.error('[Ably Token] ABLY_API_KEY not configured');
      return NextResponse.json(
        { error: 'Ably not configured' },
        { status: 500 }
      );
    }

    // Create Ably REST client
    const ably = new Ably.Rest({ key: apiKey });

    // Generate token with user's ID as client ID
    // This allows us to identify who sent messages
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: user.id,
      // Token valid for 1 hour
      ttl: 3600000,
      // Allow all capabilities (can be restricted if needed)
      capability: {
        '*': ['subscribe', 'publish', 'presence'],
      },
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error('[Ably Token] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
