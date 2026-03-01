import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Update VOD details (title, description, price, access settings)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { vodId } = await params;
    const body = await req.json();
    const { title, description, priceCoins, isPublic, subscribersOnly } = body;

    // Get VOD to verify ownership
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return NextResponse.json(
        { error: 'VOD not found' },
        { status: 404 }
      );
    }

    // Verify user is the creator
    if (vod.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the VOD creator can edit this content' },
        { status: 403 }
      );
    }

    // Validate inputs
    if (title !== undefined && (!title || title.trim() === '')) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    if (priceCoins !== undefined && (priceCoins < 0 || !Number.isInteger(priceCoins))) {
      return NextResponse.json(
        { error: 'Price must be a non-negative integer' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (priceCoins !== undefined) updates.priceCoins = priceCoins;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (subscribersOnly !== undefined) updates.subscribersOnly = subscribersOnly;

    // Update VOD
    const [updatedVOD] = await db
      .update(vods)
      .set(updates)
      .where(eq(vods.id, vodId))
      .returning();

    console.log(`[Edit VOD] Updated VOD ${vodId} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      vod: updatedVOD,
      message: 'VOD updated successfully',
    });
  } catch (error: any) {
    console.error('[Edit VOD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update VOD' },
      { status: 500 }
    );
  }
}

/**
 * Delete a VOD
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { vodId } = await params;

    // Get VOD to verify ownership
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
    });

    if (!vod) {
      return NextResponse.json(
        { error: 'VOD not found' },
        { status: 404 }
      );
    }

    // Verify user is the creator
    if (vod.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Only the VOD creator can delete this content' },
        { status: 403 }
      );
    }

    // Delete VOD (cascade will delete purchases and views)
    await db.delete(vods).where(eq(vods.id, vodId));

    console.log(`[Delete VOD] Deleted VOD ${vodId} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'VOD deleted successfully',
    });
  } catch (error: any) {
    console.error('[Delete VOD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete VOD' },
      { status: 500 }
    );
  }
}
