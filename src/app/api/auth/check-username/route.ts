import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { validateUsernameFormat, isReservedUsername } from '@/lib/reserved-usernames';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawUsername = searchParams.get('username')?.trim();

    if (!rawUsername) {
      return NextResponse.json(
        { available: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    const username = rawUsername.toLowerCase();

    // Format validation (length, characters, etc.)
    const formatCheck = validateUsernameFormat(username);
    if (!formatCheck.valid) {
      return NextResponse.json({
        available: false,
        error: formatCheck.error,
      });
    }

    // Check reserved usernames (includes 3-letter names and brand names)
    if (isReservedUsername(username)) {
      return NextResponse.json({
        available: false,
        error: 'This username is reserved for verified creators',
      });
    }

    // Check if username is already taken using Drizzle
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true },
    });

    if (existing) {
      return NextResponse.json({
        available: false,
        error: 'Username is already taken',
      });
    }

    return NextResponse.json({ available: true });

  } catch (error) {
    console.error('[check-username] Error while checking username:', error);
    return NextResponse.json(
      { available: false, error: 'Unable to check username' },
      { status: 500 }
    );
  }
}
