import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force Node.js runtime for database connections
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  try {
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required', available: false },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        available: false,
        error: 'Username must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores'
      });
    }

    const lowercaseUsername = username.toLowerCase();

    // Verify environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Username Check] Missing env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      return NextResponse.json(
        { error: 'Server configuration error', available: false },
        { status: 500 }
      );
    }

    // Use Supabase service role client
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingUser, error: queryError } = await supabase
      .from('users')
      .select('id')
      .eq('username', lowercaseUsername)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found

    if (queryError) {
      console.error('[Username Check] DB error:', queryError);
      return NextResponse.json(
        { error: 'Database error', available: false },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({
        available: false,
        error: 'Username is already taken',
        suggestions: [
          `${username}1`,
          `${username}_`,
          `${username}${Math.floor(Math.random() * 99)}`,
        ],
      });
    }

    return NextResponse.json({ available: true });

  } catch (error) {
    console.error('[Username Check] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check username',
        available: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
