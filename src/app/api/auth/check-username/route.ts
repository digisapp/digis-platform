import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

// Reserved usernames that nobody can take
const RESERVED_USERNAMES = new Set([
  'admin',
  'support',
  'digis',
  'moderator',
  'owner',
  'system',
  'root',
  'help',
  'api',
  'www',
  'mail',
  'ftp',
  'blog',
  'shop',
  'store',
  'app',
  'mobile',
  'web',
  'official',
  'verified',
  'staff',
  'team',
  'info',
  'contact',
  'security',
  'legal',
  'terms',
  'privacy',
  'about',
  'home',
  'dashboard',
  'settings',
  'login',
  'signup',
  'register',
  'account',
  'profile',
  'user',
  'users',
  'creator',
  'creators',
  'fan',
  'fans',
  'live',
  'stream',
  'streams',
  'broadcast',
  'explore',
  'search',
  'messages',
  'notifications',
  'wallet',
  'earnings',
  'payouts',
]);

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
    console.log('[check-username] Checking:', username);

    // Length validation
    if (username.length < MIN_LENGTH) {
      return NextResponse.json({
        available: false,
        error: `Username must be at least ${MIN_LENGTH} characters`,
      });
    }

    if (username.length > MAX_LENGTH) {
      return NextResponse.json({
        available: false,
        error: `Username must be at most ${MAX_LENGTH} characters`,
      });
    }

    // Must start with a letter
    if (!/^[a-z]/.test(username)) {
      return NextResponse.json({
        available: false,
        error: 'Username must start with a letter',
      });
    }

    // Only letters, numbers, and underscores
    if (!/^[a-z][a-z0-9_]*$/.test(username)) {
      return NextResponse.json({
        available: false,
        error: 'Username can only contain letters, numbers, and underscores',
      });
    }

    // Check reserved usernames
    if (RESERVED_USERNAMES.has(username)) {
      return NextResponse.json({
        available: false,
        error: 'This username is reserved',
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
