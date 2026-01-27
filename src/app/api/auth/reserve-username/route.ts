import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, creatorInvites, creatorSettings, aiTwinSettings, profiles, creatorApplications } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limit';
import { isBlockedDomain, isHoneypotTriggered } from '@/lib/validation/spam-protection';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If no username provided, generate a temporary one
    // Users will set their real username later in the onboarding flow
    const hasUsername = username && username.trim();

    const cleanEmail = email.toLowerCase().trim();

    // Determine user role based on:
    // 1. If email matches a pending creator invite → creator (verified, admin pre-approved)
    // 2. Otherwise → fan (must apply via /apply-creator for admin approval)
    //
    // SECURITY: Only admin-approved paths can create creators:
    // - Invite claim (/api/claim/[code])
    // - Admin role update (/api/admin/users/[userId]/role)
    // - Admin application approve (/api/admin/creator-applications/[id]/approve)
    let userRole: 'fan' | 'creator' = 'fan';
    let isCreatorVerified = false;
    let matchedInvite = null;
    let wantsToBeCreator = defaultRole === 'creator';

    try {
      matchedInvite = await db.query.creatorInvites.findFirst({
        where: and(
          eq(creatorInvites.email, cleanEmail),
          eq(creatorInvites.status, 'pending')
        ),
      });

      if (matchedInvite) {
        // Email is in invite list - auto-verify as creator (admin pre-approved via invite)
        userRole = 'creator';
        isCreatorVerified = true;
        console.log(`[Signup] Email ${cleanEmail} matched creator invite, granting verified creator role`);
      } else if (wantsToBeCreator) {
        // Signed up wanting to be a creator - stays as fan, will auto-create application
        console.log(`[Signup] Email ${cleanEmail} wants to be creator - will create pending application`);
      }
    } catch (err) {
      console.error('[Signup] Error checking creator invites:', err);
      // Continue as fan if check fails
    }

    // Spam protection: Check honeypot field
    if (isHoneypotTriggered(website)) {
      console.log('[SPAM] Honeypot triggered for:', email);
      // Return success to not alert bots, but don't create account
      return NextResponse.json({ success: true, username: hasUsername ? username.toLowerCase() : 'user_temp' });
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

    // Generate or validate username
    let cleanUsername: string;

    if (hasUsername) {
      // Validate provided username format
      cleanUsername = username.toLowerCase().trim();
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
    } else {
      // Generate a temporary auto-username (user_shortUUID)
      // Users will set their real username later in the onboarding flow
      const shortId = userId.slice(0, 8);
      cleanUsername = `user_${shortId}`;
      console.log(`[Signup] No username provided for ${cleanEmail}, using temp: ${cleanUsername}`);
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

    // If matched a creator invite, mark it as claimed and set up creator records
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

      // Update Supabase auth metadata for creator
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          app_metadata: { role: 'creator' },
          user_metadata: { is_creator_verified: true },
        });
        console.log(`[Signup] Auth metadata updated for creator: ${cleanEmail}`);
      } catch (err) {
        console.error('[Signup] Error updating auth metadata:', err);
      }

      // Create creator settings
      try {
        await db.insert(creatorSettings).values({
          userId: userId,
          messageRate: 3,
          callRatePerMinute: 25,
          minimumCallDuration: 5,
          isAvailableForCalls: false,
          voiceCallRatePerMinute: 15,
          minimumVoiceCallDuration: 5,
          isAvailableForVoiceCalls: false,
        }).onConflictDoNothing();
        console.log(`[Signup] Creator settings created for: ${cleanEmail}`);
      } catch (err) {
        console.error('[Signup] Error creating creator settings:', err);
      }

      // Create AI Twin settings
      try {
        await db.insert(aiTwinSettings).values({
          creatorId: userId,
          enabled: false,
          textChatEnabled: false,
          voice: 'ara',
          pricePerMinute: 20,
          minimumMinutes: 5,
          maxSessionMinutes: 60,
          textPricePerMessage: 5,
        }).onConflictDoNothing();
        console.log(`[Signup] AI Twin settings created for: ${cleanEmail}`);
      } catch (err) {
        console.error('[Signup] Error creating AI Twin settings:', err);
      }

      // Create profile with Instagram handle from invite
      try {
        await db.insert(profiles).values({
          userId: userId,
          instagramHandle: matchedInvite.instagramHandle || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();
        console.log(`[Signup] Profile created for: ${cleanEmail}`);
      } catch (err) {
        console.error('[Signup] Error creating profile:', err);
      }
    }

    // Note: We don't auto-create creator applications during signup anymore.
    // Users who select "Creator" during signup are redirected to /creator/apply
    // where they fill out the full application form with details (name, instagram, etc).
    // This provides a better UX and ensures applications have complete information.
    if (wantsToBeCreator && !matchedInvite) {
      console.log(`[Signup] User ${cleanEmail} wants to be creator - will redirect to /creator/apply`);
    }

    return NextResponse.json({
      success: true,
      username: cleanUsername,
      role: userRole,
      isCreator: userRole === 'creator',
      applicationPending: wantsToBeCreator && !matchedInvite, // Let frontend know to show pending status
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
