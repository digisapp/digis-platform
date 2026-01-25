import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { creatorInvites, users, creatorSettings, aiTwinSettings, profiles } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { sendBatchInvites, sendCreatorInvite, testInviteEmail, sendExaModelsBatchInvites, sendExaModelsInvite, testExaModelsInviteEmail } from '@/lib/email/creator-invite-campaign';
import { testCreatorEarningsEmail } from '@/lib/email/creator-earnings';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { nanoid } from 'nanoid';

async function isAdmin(request: NextRequest): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  // Check admin status from app_metadata (synced from DB isAdmin flag)
  const appMeta = user.app_metadata || {};
  return appMeta.isAdmin === true || appMeta.role === 'admin';
}

// POST: Send invite campaign
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, recipients, config, testEmail } = body;

    // Test email
    if (action === 'test') {
      if (!testEmail) {
        return NextResponse.json({ error: 'testEmail required' }, { status: 400 });
      }
      const result = await testInviteEmail(testEmail);
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test email sent!' : `Failed: ${result.error || 'Unknown error'}`,
        error: result.error
      });
    }

    // Test EXA Models campaign email
    if (action === 'test-exa') {
      if (!testEmail) {
        return NextResponse.json({ error: 'testEmail required' }, { status: 400 });
      }
      const result = await testExaModelsInviteEmail(testEmail);
      return NextResponse.json({
        success: result.success,
        message: result.success ? 'EXA Models test email sent!' : `Failed: ${result.error || 'Unknown error'}`,
        error: result.error
      });
    }

    // Test earnings notification email
    if (action === 'test-earnings') {
      if (!testEmail) {
        return NextResponse.json({ error: 'testEmail required' }, { status: 400 });
      }
      const eventType = body.eventType || 'purchase';
      const result = await testCreatorEarningsEmail(testEmail, eventType);
      return NextResponse.json({
        success: result.success,
        message: result.success ? `Test ${eventType} email sent!` : `Failed: ${result.error || 'Unknown error'}`,
        error: result.error
      });
    }

    // Send single invite
    if (action === 'single') {
      const { email, name, inviteUrl } = body;
      if (!email || !inviteUrl) {
        return NextResponse.json({ error: 'email and inviteUrl required' }, { status: 400 });
      }
      const result = await sendCreatorInvite({ email, name, inviteUrl });
      return NextResponse.json(result);
    }

    // Send batch campaign
    if (action === 'batch') {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: 'recipients array required' }, { status: 400 });
      }

      // Validate recipients have required fields
      for (const r of recipients) {
        if (!r.email || !r.inviteUrl) {
          return NextResponse.json({
            error: 'Each recipient must have email and inviteUrl',
            invalidRecipient: r
          }, { status: 400 });
        }
      }

      const result = await sendBatchInvites(recipients, config);

      // Mark successfully sent invites as emailed
      const sentEmails = result.results
        .filter(r => r.success)
        .map(r => r.email);

      if (sentEmails.length > 0) {
        await db
          .update(creatorInvites)
          .set({ emailSentAt: new Date() })
          .where(inArray(creatorInvites.email, sentEmails));
      }

      return NextResponse.json(result);
    }

    // Send EXA Models batch campaign (fun & vibey template)
    if (action === 'exa-batch') {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: 'recipients array required' }, { status: 400 });
      }

      // Validate recipients have required fields
      for (const r of recipients) {
        if (!r.email || !r.inviteUrl) {
          return NextResponse.json({
            error: 'Each recipient must have email and inviteUrl',
            invalidRecipient: r
          }, { status: 400 });
        }
      }

      const result = await sendExaModelsBatchInvites(recipients, config);

      // Mark successfully sent invites as emailed
      const sentEmails = result.results
        .filter(r => r.success)
        .map(r => r.email);

      if (sentEmails.length > 0) {
        await db
          .update(creatorInvites)
          .set({ emailSentAt: new Date() })
          .where(inArray(creatorInvites.email, sentEmails));
      }

      return NextResponse.json(result);
    }

    // Create account with generated password
    if (action === 'create-account') {
      const { inviteId } = body;
      if (!inviteId) {
        return NextResponse.json({ error: 'inviteId required' }, { status: 400 });
      }

      // Get the invite
      const invite = await db.query.creatorInvites.findFirst({
        where: eq(creatorInvites.id, inviteId),
      });

      if (!invite) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }

      if (invite.status !== 'pending') {
        return NextResponse.json({ error: `Invite already ${invite.status}` }, { status: 400 });
      }

      if (!invite.email) {
        return NextResponse.json({ error: 'Invite has no email' }, { status: 400 });
      }

      // Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, invite.email.toLowerCase()),
      });

      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }

      // Generate password: Digis + 4 random chars + ! + 3 random numbers
      const randomChars = nanoid(4).replace(/[^a-zA-Z]/g, 'x');
      const randomNums = Math.floor(Math.random() * 900 + 100);
      const password = `Digis${randomChars}!${randomNums}`;

      // Create username from instagram handle or email
      const username = (invite.instagramHandle || invite.email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');

      // Check if username is taken
      const existingUsername = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      const finalUsername = existingUsername ? `${username}${nanoid(4)}` : username;

      try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: invite.email,
          password: password,
          email_confirm: true, // Auto-verify email
          app_metadata: { role: 'creator' },
          user_metadata: {
            display_name: invite.displayName || finalUsername,
            username: finalUsername,
            is_creator_verified: true,
          },
        });

        if (authError || !authData.user) {
          console.error('[CreateAccount] Auth error:', authError);
          return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 500 });
        }

        const userId = authData.user.id;

        // Create user in database
        await db.insert(users).values({
          id: userId,
          email: invite.email.toLowerCase(),
          username: finalUsername,
          displayName: invite.displayName || finalUsername,
          role: 'creator',
          verificationStatus: 'grandfathered',
          isCreatorVerified: true,
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Create profile
        await db.insert(profiles).values({
          userId: userId,
          instagramHandle: invite.instagramHandle || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing();

        // Create creator settings
        await db.insert(creatorSettings).values({
          userId: userId,
          messageRate: 25,
          callRatePerMinute: 25,
          minimumCallDuration: 5,
          isAvailableForCalls: false,
          voiceCallRatePerMinute: 15,
          minimumVoiceCallDuration: 5,
          isAvailableForVoiceCalls: false,
        }).onConflictDoNothing();

        // Create AI Twin settings
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

        // Mark invite as claimed
        await db.update(creatorInvites)
          .set({
            status: 'claimed',
            claimedBy: userId,
            claimedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(creatorInvites.id, inviteId));

        console.log('[CreateAccount] Created account:', invite.email, finalUsername);

        return NextResponse.json({
          success: true,
          email: invite.email,
          username: finalUsername,
          password: password,
        });

      } catch (error) {
        console.error('[CreateAccount] Error:', error);
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Failed to create account'
        }, { status: 500 });
      }
    }

    // Generate invite URLs from pending invites
    if (action === 'generate-from-invites') {
      // Get all pending invites that haven't been emailed yet
      const pendingInvites = await db.query.creatorInvites.findMany({
        where: and(
          eq(creatorInvites.status, 'pending'),
          isNull(creatorInvites.emailSentAt) // Only those not yet emailed
        ),
      });

      // Filter to only those with emails
      const withEmails = pendingInvites.filter(invite => invite.email);

      const recipients = withEmails.map((invite) => ({
        email: invite.email!,
        name: invite.displayName || invite.instagramHandle || undefined,
        inviteUrl: `https://digis.cc/join/${invite.code}`,
        id: invite.id,
      }));

      return NextResponse.json({
        count: recipients.length,
        recipients,
        message: recipients.length === 0
          ? 'All pending invites have already been emailed'
          : `Found ${recipients.length} invites ready to email`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Campaign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get campaign stats / pending invites
export async function GET(request: NextRequest) {
  try {
    if (!await isAdmin(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all invites
    const allInvites = await db.query.creatorInvites.findMany({
      columns: {
        id: true,
        status: true,
        email: true,
        displayName: true,
        instagramHandle: true,
        code: true,
        emailSentAt: true,
        createdAt: true,
      },
      orderBy: (table, { desc: descFn }) => [descFn(table.createdAt)],
    });

    const stats = {
      total: allInvites.length,
      pending: allInvites.filter((c: typeof allInvites[0]) => c.status === 'pending').length,
      claimed: allInvites.filter((c: typeof allInvites[0]) => c.status === 'claimed').length,
      expired: allInvites.filter((c: typeof allInvites[0]) => c.status === 'expired').length,
      revoked: allInvites.filter((c: typeof allInvites[0]) => c.status === 'revoked').length,
      withEmail: allInvites.filter((c: typeof allInvites[0]) => c.email).length,
      emailed: allInvites.filter((c: typeof allInvites[0]) => c.emailSentAt).length,
      pendingNotEmailed: allInvites.filter((c: typeof allInvites[0]) => c.status === 'pending' && c.email && !c.emailSentAt).length,
    };

    // Get pending invites with emails that HAVEN'T been sent yet
    const readyToInvite = allInvites
      .filter((c: typeof allInvites[0]) => c.status === 'pending' && c.email && !c.emailSentAt)
      .slice(0, 100)
      .map((c: typeof allInvites[0]) => ({
        id: c.id,
        email: c.email,
        name: c.displayName || c.instagramHandle,
        inviteUrl: `https://digis.cc/join/${c.code}`,
        createdAt: c.createdAt,
      }));

    return NextResponse.json({
      stats,
      readyToInvite,
    });
  } catch (error) {
    console.error('[Admin Campaign] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
