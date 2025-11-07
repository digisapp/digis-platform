import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for database connections
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
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

    // Check if username exists
    const lowercaseUsername = username.toLowerCase();
    console.log('[Username Check] Querying for:', lowercaseUsername);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, lowercaseUsername),
      columns: {
        id: true,
        username: true,
      }
    });

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
