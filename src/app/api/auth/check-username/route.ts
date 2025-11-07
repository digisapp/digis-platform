import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { 
          available: false, 
          error: 'Username must be 3-20 characters (letters, numbers, underscores only)' 
        },
        { status: 200 }
      );
    }

    // Check if username exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username.toLowerCase()),
    });

    if (existingUser) {
      // Generate suggestions
      const suggestions = [
        `${username}1`,
        `${username}_official`,
        `${username}.creator`,
        `${username}${Math.floor(Math.random() * 99)}`,
      ];

      return NextResponse.json({
        available: false,
        suggestions,
      });
    }

    return NextResponse.json({
      available: true,
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}
