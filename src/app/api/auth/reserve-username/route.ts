import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorInvites } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
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

    const { userId, email, username, website, defaultRole } = await request.json();

    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Determine user role based on:
    // 1. If email matches a pending creator invite → creator (verified)
    // 2. If defaultRole is 'creator' (signed up via /become-creator) → creator (pending verification)
    // 3. Otherwise → fan (no verification needed)
    let userRole: 'fan' | 'creator' = defaultRole === 'creator' ? 'creator' : 'fan';
    let isCreatorVerified = false;
    let matchedInvite = null;

    try {
      matchedInvite = await db.query.creatorInvites.findFirst({
        where: and(
          eq(creatorInvites.email, cleanEmail),
          eq(creatorInvites.status, 'pending')
        ),
      });

      if (matchedInvite) {
        // Email is in invite list - auto-verify as creator
        userRole = 'creator';
        isCreatorVerified = true;
        console.log(`[Signup] Email ${cleanEmail} matched creator invite, granting verified creator role`);
      } else if (defaultRole === 'creator') {
        // Signed up as creator but not in invite list - pending verification
        console.log(`[Signup] Email ${cleanEmail} signed up as creator (pending verification)`);
      }
    } catch (err) {
      console.error('[Signup] Error checking creator invites:', err);
      // Continue with defaultRole if check fails
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
      // Update existing row with username and role
      await db.update(users)
        .set({
          username: cleanUsername,
          displayName: cleanUsername,
          role: userRole,
          isCreatorVerified: isCreatorVerified,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Create new user row with username and role
      await db.insert(users).values({
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        displayName: cleanUsername,
        role: userRole,
        isCreatorVerified: isCreatorVerified,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // If matched a creator invite, mark it as claimed
    if (matchedInvite) {
      try {
        await db.update(creatorInvites)
          .set({
            status: 'claimed',
            claimedBy: userId,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(creatorInvites.id, matchedInvite.id));
        console.log(`[Signup] Marked invite ${matchedInvite.id} as claimed by ${userId}`);
      } catch (err) {
        console.error('[Signup] Error marking invite as claimed:', err);
        // Don't fail the signup if this fails
      }
    }

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      role: userRole,
      isCreator: userRole === 'creator',
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
