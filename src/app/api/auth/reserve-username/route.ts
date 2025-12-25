import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { isBlockedDomain, isHoneypotTriggered } from '@/lib/validation/spam-protection';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/reserve-username - Reserve username during signup
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 requests/min per IP (prevents username enumeration/bot spam)
    const rl = await rateLimit(request, 'auth:signup');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rl.headers }
      );
    }

    const { userId, email, username, website } = await request.json();

    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Spam protection: Check honeypot field
    if (isHoneypotTriggered(website)) {
      console.log('[SPAM] Honeypot triggered for:', email);
      // Return success to not alert bots, but don't create account
      return NextResponse.json({ success: true, username: username.toLowerCase() });
    }

    // Spam protection: Check email domain blocklist
    const domainCheck = isBlockedDomain(email);
    if (domainCheck.blocked) {
      console.log('[SPAM] Blocked domain for:', email, '-', domainCheck.reason);
      return NextResponse.json(
        { error: domainCheck.reason || 'This email provider is not allowed' },
        { status: 400 }
      );
    }

    // Validate username format
    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Invalid username format' },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, cleanUsername),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Check if user row already exists (from a previous signup attempt)
    const existingUserRow = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (existingUserRow) {
      // Update existing row with username
      await db.update(users)
        .set({
          username: cleanUsername,
          displayName: cleanUsername,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user row with username
      await db.insert(users).values({
        id: userId,
        email: email.toLowerCase(),
        username: cleanUsername,
        displayName: cleanUsername,
        role: 'fan',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      username: cleanUsername,
    });
  } catch (error: any) {
    console.error('Error reserving username:', error);

    // Handle unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reserve username' },
      { status: 500 }
    );
  }
}
