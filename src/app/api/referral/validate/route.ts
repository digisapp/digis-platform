import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/db/schema/users';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/referral/validate?code=username
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Look up the referrer by username
    const referrer = await db.query.users.findFirst({
      where: and(
        eq(users.username, code.toLowerCase()),
        eq(users.role, 'creator')
      ),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (!referrer) {
      return NextResponse.json(
        { valid: false, error: 'Creator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      referrer: {
        id: referrer.id,
        username: referrer.username,
        displayName: referrer.displayName,
        avatarUrl: referrer.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Error validating referral:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate referral' },
      { status: 500 }
    );
  }
}
