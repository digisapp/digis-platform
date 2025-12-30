import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { db } from '@/lib/data/system';
import { creatorInvites, users, profiles } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { validateUsername } from '@/lib/utils/username';
import { rateLimit } from '@/lib/rate-limit';
import { sendWelcomeEmail } from '@/lib/email/welcome';

export const runtime = 'nodejs';

/**
 * GET /api/claim/[code]
 * Validate an invite code and return invite details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Find the invite
    const invite = await db.query.creatorInvites.findFirst({
      where: eq(creatorInvites.code, code),
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if expired
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      // Update status to expired if not already
      if (invite.status === 'pending') {
        await db
          .update(creatorInvites)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(creatorInvites.id, invite.id));
      }
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    // Check status
    if (invite.status === 'claimed') {
      return NextResponse.json({ error: 'This invite has already been claimed' }, { status: 410 });
    }

    if (invite.status === 'revoked') {
      return NextResponse.json({ error: 'This invite has been revoked' }, { status: 410 });
    }

    if (invite.status === 'expired') {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    // Return invite details (don't expose internal ID)
    return NextResponse.json({
      valid: true,
      instagramHandle: invite.instagramHandle,
      displayName: invite.displayName,
      email: invite.email,
      hasEmail: !!invite.email,
    });
  } catch (error: any) {
    console.error('Error validating invite:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claim/[code]
 * Claim an invite and create the creator account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    // Rate limit claims (5/min per IP)
    const rl = await rateLimit(request, 'claim:invite');
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in a minute.' },
        { status: 429, headers: rl.headers }
      );
    }

    const { code } = await params;
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Find the invite
    const invite = await db.query.creatorInvites.findFirst({
      where: eq(creatorInvites.code, code),
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if expired
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      if (invite.status === 'pending') {
        await db
          .update(creatorInvites)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(creatorInvites.id, invite.id));
      }
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
    }

    // Check status
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `This invite is ${invite.status}` },
        { status: 410 }
      );
    }

    // Determine the email to use
    const userEmail = email || invite.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // The username will be the Instagram handle
    const username = invite.instagramHandle.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: `Invalid username: ${usernameValidation.error}` },
        { status: 400 }
      );
    }

    // Check if username or email already exists
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const existingUser = await db.query.users.findFirst({
      where: or(
        eq(users.username, username),
        eq(users.email, userEmail.toLowerCase())
      ),
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 400 }
        );
      }
      if (existingUser.email === userEmail.toLowerCase()) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
    }

    // Create Supabase auth user
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userEmail,
      password,
      options: {
        data: {
          display_name: invite.displayName || username,
          username: username,
        },
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create user in database with creator role and grandfathered verification
    try {
      await db.insert(users).values({
        id: authData.user.id,
        email: userEmail.toLowerCase(),
        username: username,
        displayName: invite.displayName || username,
        role: 'creator',
        verificationStatus: 'grandfathered',
        isCreatorVerified: true, // Auto-verify since they were invited
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create profile with Instagram handle
      await db.insert(profiles).values({
        userId: authData.user.id,
        instagramHandle: invite.instagramHandle,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Try to create via admin client as fallback
      const { error: insertError } = await adminClient
        .from('users')
        .insert({
          id: authData.user.id,
          email: userEmail.toLowerCase(),
          username: username,
          display_name: invite.displayName || username,
          role: 'creator',
          verification_status: 'grandfathered',
          is_creator_verified: true,
          last_seen_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Admin client insert error:', insertError);
      }
    }

    // Mark invite as claimed
    await db
      .update(creatorInvites)
      .set({
        status: 'claimed',
        claimedBy: authData.user.id,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creatorInvites.id, invite.id));

    // Send creator welcome email (fire-and-forget)
    sendWelcomeEmail({
      email: userEmail,
      name: invite.displayName || username,
      username,
      isCreator: true,
    }).catch((err) => console.error('[Claim] Failed to send welcome email:', err));

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify, then log in.',
      username,
    });
  } catch (error: any) {
    console.error('Error claiming invite:', error);
    return NextResponse.json(
      { error: 'Failed to claim invite' },
      { status: 500 }
    );
  }
}
