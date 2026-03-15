import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, cloudItems, cloudScheduledDrops, creatorPricingDefaults } from '@/lib/data/system';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - List creator's scheduled drops
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const drops = await db.query.cloudScheduledDrops.findMany({
      where: eq(cloudScheduledDrops.creatorId, user.id),
      orderBy: [desc(cloudScheduledDrops.scheduledFor)],
      with: { item: true },
    });

    return NextResponse.json({ drops });
  } catch (error: any) {
    console.error('[CLOUD DROPS GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * POST - Schedule drops for Drops items
 * Body: { itemIds: string[], frequency: 'daily' | 'custom', startDate?: string, times?: string[] }
 *
 * frequency: 'daily' — one item per day starting from startDate
 * frequency: 'custom' — provide times[] array with ISO dates per item
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can schedule drops' }, { status: 403 });
    }

    const body = await request.json();
    const { itemIds, frequency, startDate } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds required' }, { status: 400 });
    }

    if (itemIds.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 items per drop schedule' }, { status: 400 });
    }

    // Verify items belong to creator
    const items = await db.select()
      .from(cloudItems)
      .where(and(eq(cloudItems.creatorId, user.id), inArray(cloudItems.id, itemIds)));

    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'Some items not found' }, { status: 400 });
    }

    // Get pricing defaults to apply to unpriced items
    const defaults = await db.query.creatorPricingDefaults.findFirst({
      where: eq(creatorPricingDefaults.creatorId, user.id),
    });

    // Generate schedule
    const batchId = uuidv4();
    const start = startDate ? new Date(startDate) : new Date();
    // Ensure start is at least tomorrow
    const now = new Date();
    if (start <= now) {
      start.setDate(now.getDate() + 1);
    }
    start.setHours(12, 0, 0, 0); // Default to noon

    const dropRecords = [];

    if (frequency === 'daily' || !frequency) {
      // One item per day
      for (let i = 0; i < itemIds.length; i++) {
        const scheduledFor = new Date(start);
        scheduledFor.setDate(scheduledFor.getDate() + i);

        dropRecords.push({
          creatorId: user.id,
          itemId: itemIds[i],
          scheduledFor,
          batchId,
        });
      }
    } else if (frequency === 'twice_daily') {
      // Two items per day (morning + evening)
      for (let i = 0; i < itemIds.length; i++) {
        const dayOffset = Math.floor(i / 2);
        const scheduledFor = new Date(start);
        scheduledFor.setDate(scheduledFor.getDate() + dayOffset);
        scheduledFor.setHours(i % 2 === 0 ? 10 : 18, 0, 0, 0);

        dropRecords.push({
          creatorId: user.id,
          itemId: itemIds[i],
          scheduledFor,
          batchId,
        });
      }
    } else {
      return NextResponse.json({ error: 'frequency must be daily or twice_daily' }, { status: 400 });
    }

    // Price unpriced items with defaults
    if (defaults) {
      for (const item of items) {
        if (!item.priceCoins) {
          let price: number | null = null;
          if (item.type === 'photo') price = defaults.photoPriceCoins;
          else if (item.type === 'video') {
            price = (item.durationSeconds ?? 0) < 60
              ? defaults.shortVideoPriceCoins
              : defaults.longVideoPriceCoins;
          }
          if (price) {
            await db.update(cloudItems).set({ priceCoins: price }).where(eq(cloudItems.id, item.id));
          }
        }
      }
    }

    // Insert drops
    await db.insert(cloudScheduledDrops).values(dropRecords);

    // Set items to 'ready' status
    await db.update(cloudItems)
      .set({ status: 'ready' })
      .where(and(
        eq(cloudItems.creatorId, user.id),
        inArray(cloudItems.id, itemIds),
      ));

    return NextResponse.json({
      scheduled: dropRecords.length,
      batchId,
      firstDrop: dropRecords[0]?.scheduledFor,
      lastDrop: dropRecords[dropRecords.length - 1]?.scheduledFor,
      daysSpan: Math.ceil(dropRecords.length / (frequency === 'twice_daily' ? 2 : 1)),
    }, { status: 201 });
  } catch (error: any) {
    console.error('[CLOUD DROPS POST]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * DELETE - Cancel scheduled drops
 * Body: { batchId: string } or { dropIds: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { batchId, dropIds } = body;

    if (batchId) {
      await db.update(cloudScheduledDrops)
        .set({ status: 'cancelled' })
        .where(and(
          eq(cloudScheduledDrops.creatorId, user.id),
          eq(cloudScheduledDrops.batchId, batchId),
          eq(cloudScheduledDrops.status, 'scheduled'),
        ));
    } else if (dropIds && Array.isArray(dropIds)) {
      await db.update(cloudScheduledDrops)
        .set({ status: 'cancelled' })
        .where(and(
          eq(cloudScheduledDrops.creatorId, user.id),
          inArray(cloudScheduledDrops.id, dropIds),
          eq(cloudScheduledDrops.status, 'scheduled'),
        ));
    } else {
      return NextResponse.json({ error: 'batchId or dropIds required' }, { status: 400 });
    }

    return NextResponse.json({ cancelled: true });
  } catch (error: any) {
    console.error('[CLOUD DROPS DELETE]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
