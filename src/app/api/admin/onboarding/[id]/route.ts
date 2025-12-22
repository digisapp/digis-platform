import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/admin/check-admin';
import { db } from '@/lib/data/system';
import { creatorInvites } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * DELETE /api/admin/onboarding/[id]
 * Revoke an invite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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
    console.error('Error revoking invite:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invite' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/onboarding/[id]
 * Update invite (resend, extend expiration)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

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
    console.error('Error updating invite:', error);
    return NextResponse.json(
      { error: 'Failed to update invite' },
      { status: 500 }
    );
  }
}
