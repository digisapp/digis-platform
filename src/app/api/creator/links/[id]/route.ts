import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { creatorLinks, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT /api/creator/links/[id] - Update a link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const [profile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile || profile.role !== 'creator') {
      return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
    }

    // Verify ownership of the link
    const [existingLink] = await db
      .select()
      .from(creatorLinks)
      .where(and(
        eq(creatorLinks.id, id),
        eq(creatorLinks.creatorId, user.id)
      ))
      .limit(1);

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, url, emoji, isActive } = body;

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }

    // Update the link
    const [updatedLink] = await db
      .update(creatorLinks)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(url !== undefined && { url: url.trim() }),
        ...(emoji !== undefined && { emoji: emoji || null }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(creatorLinks.id, id))
      .returning();

    return NextResponse.json({ link: updatedLink });
  } catch (error) {
    console.error('[Creator Links PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
  }
}

// DELETE /api/creator/links/[id] - Delete a link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a creator
    const [profile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile || profile.role !== 'creator') {
      return NextResponse.json({ error: 'Creator access required' }, { status: 403 });
    }

    // Verify ownership and delete
    const [deletedLink] = await db
      .delete(creatorLinks)
      .where(and(
        eq(creatorLinks.id, id),
        eq(creatorLinks.creatorId, user.id)
      ))
      .returning();

    if (!deletedLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Creator Links DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
