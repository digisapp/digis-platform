import { NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorInvites } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAdminParams } from '@/lib/auth/withAdmin';

export const runtime = 'nodejs';

/**
 * DELETE /api/admin/onboarding/[id]
 * Revoke an invite
 */
export const DELETE = withAdminParams<{ id: string }>(async ({ params }) => {
  try {
    const { id } = await params;

    // Get the invite
    const invite = await db.query.creatorInvites.findFirst({
      where: eq(creatorInvites.id, id),
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.status === 'claimed') {
      return NextResponse.json(
        { error: 'Cannot revoke a claimed invite' },
        { status: 400 }
      );
    }

    // Update status to revoked
    await db
      .update(creatorInvites)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(creatorInvites.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN ONBOARDING DELETE] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to revoke invite' },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/admin/onboarding/[id]
 * Update invite (resend, extend expiration)
 */
export const PATCH = withAdminParams<{ id: string }>(async ({ params, request }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, expiresInDays } = body;

    // Get the invite
    const invite = await db.query.creatorInvites.findFirst({
      where: eq(creatorInvites.id, id),
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (action === 'extend' && expiresInDays) {
      // Extend expiration
      const newExpiration = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      await db
        .update(creatorInvites)
        .set({
          expiresAt: newExpiration,
          status: invite.status === 'expired' ? 'pending' : invite.status,
          updatedAt: new Date(),
        })
        .where(eq(creatorInvites.id, id));

      return NextResponse.json({ success: true, expiresAt: newExpiration });
    }

    if (action === 'reactivate' && invite.status === 'expired') {
      // Reactivate expired invite
      await db
        .update(creatorInvites)
        .set({
          status: 'pending',
          expiresAt: null, // Remove expiration
          updatedAt: new Date(),
        })
        .where(eq(creatorInvites.id, id));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[ADMIN ONBOARDING PATCH] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { error: 'Failed to update invite' },
      { status: 500 }
    );
  }
});
