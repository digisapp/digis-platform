import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, cloudPacks, cloudPackItems } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Get single pack with items
 */
export async function GET(
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

    const pack = await db.query.cloudPacks.findFirst({
      where: and(eq(cloudPacks.id, id), eq(cloudPacks.creatorId, user.id)),
      with: {
        items: {
          with: { item: true },
          orderBy: (cloudPackItems, { asc }) => [asc(cloudPackItems.sortOrder)],
        },
      },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    return NextResponse.json({ pack });
  } catch (error: any) {
    console.error('[CLOUD PACK GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * PATCH - Update pack details or status
 */
export async function PATCH(
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

    const pack = await db.query.cloudPacks.findFirst({
      where: and(eq(cloudPacks.id, id), eq(cloudPacks.creatorId, user.id)),
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description || null;
    }

    if (body.coverImageUrl !== undefined) {
      updates.coverImageUrl = body.coverImageUrl || null;
    }

    if (body.priceCoins !== undefined) {
      if (typeof body.priceCoins !== 'number' || body.priceCoins < 0 || !Number.isInteger(body.priceCoins)) {
        return NextResponse.json({ error: 'priceCoins must be a positive integer' }, { status: 400 });
      }
      updates.priceCoins = body.priceCoins;
    }

    if (body.status !== undefined) {
      if (!['draft', 'live'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      // Can't go live with 0 items
      if (body.status === 'live' && pack.itemCount === 0) {
        return NextResponse.json({ error: 'Add items before going live' }, { status: 400 });
      }
      updates.status = body.status;
    }

    const [updated] = await db.update(cloudPacks)
      .set(updates)
      .where(eq(cloudPacks.id, id))
      .returning();

    return NextResponse.json({ pack: updated });
  } catch (error: any) {
    console.error('[CLOUD PACK PATCH]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * DELETE - Remove a pack (items are not deleted, just unlinked)
 */
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

    const pack = await db.query.cloudPacks.findFirst({
      where: and(eq(cloudPacks.id, id), eq(cloudPacks.creatorId, user.id)),
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    await db.delete(cloudPacks).where(eq(cloudPacks.id, id));

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('[CLOUD PACK DELETE]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
