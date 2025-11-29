import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit } from '@/lib/rate-limit';

// Force Node.js runtime for database connections
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Rate limit username checks (20/min per IP)
    const rl = await rateLimit(request, 'auth:check-username');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: rl.headers }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    console.log('[Username Check] Checking username:', username);

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      console.log('[Username Check] Invalid format:', username);
      return NextResponse.json(
        {
          available: false,
          error: 'Username must be 3-20 characters (letters, numbers, underscores only)'
        },
        { status: 200 }
      );
    }

    // Check if username exists using Supabase client
    const lowercaseUsername = username.toLowerCase();
    console.log('[Username Check] Querying for:', lowercaseUsername);

    // Use Supabase service role client for reliable server-side queries
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', lowercaseUsername)
      .single();

    if (queryError && queryError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Username Check] Database error:', queryError);
      throw queryError;
    }

    console.log('[Username Check] Found existing user:', existingUser ? 'YES' : 'NO');

    if (existingUser) {
      // Generate suggestions
      const suggestions = [
        `${username}1`,
        `${username}_official`,
        `${username}${Math.floor(Math.random() * 99)}`,
      ];

      return NextResponse.json(
        {
          available: false,
          suggestions,
        },
        { status: 409 } // 409 Conflict for taken username
      );
    }

    return NextResponse.json(
      {
        available: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Username Check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check username availability', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
