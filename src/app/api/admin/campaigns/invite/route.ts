import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { creatorInvites } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { sendBatchInvites, sendCreatorInvite, testInviteEmail } from '@/lib/email/creator-invite-campaign';
import { testCreatorEarningsEmail } from '@/lib/email/creator-earnings';

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
