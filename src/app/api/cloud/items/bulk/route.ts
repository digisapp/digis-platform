import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, cloudItems, creatorPricingDefaults } from '@/lib/data/system';
import { eq, and, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH - Bulk update Drops items
 * Actions: price_all (apply defaults), set_status, set_price
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, itemIds, priceCoins, status } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // ── Price All: apply default prices to all unpriced items ──
    if (action === 'price_all') {
      const defaults = await db.query.creatorPricingDefaults.findFirst({
        where: eq(creatorPricingDefaults.creatorId, user.id),
      });

      if (!defaults || (!defaults.photoPriceCoins && !defaults.shortVideoPriceCoins && !defaults.longVideoPriceCoins)) {
        return NextResponse.json({ error: 'Set your default prices first' }, { status: 400 });
      }

      // Get all unpriced items
      const unpricedItems = await db.select()
        .from(cloudItems)
        .where(and(
          eq(cloudItems.creatorId, user.id),
          eq(cloudItems.priceCoins, 0), // Will also catch null via IS NULL below
        ));

      // Also get items with null price
      const nullPricedItems = await db.select()
        .from(cloudItems)
        .where(and(
          eq(cloudItems.creatorId, user.id),
        ));

      const toUpdate = nullPricedItems.filter(item => item.priceCoins === null || item.priceCoins === 0);

      let updated = 0;
      for (const item of toUpdate) {
        let price: number | null = null;

        if (item.type === 'photo') {
          price = defaults.photoPriceCoins;
        } else if (item.type === 'video') {
          const isShort = (item.durationSeconds ?? 0) < 60;
          price = isShort ? defaults.shortVideoPriceCoins : defaults.longVideoPriceCoins;
        }

        if (price !== null) {
          await db.update(cloudItems)
            .set({ priceCoins: price })
            .where(eq(cloudItems.id, item.id));
          updated++;
        }
      }

      return NextResponse.json({ updated, action: 'price_all' });
    }

    // ── Set Status or Price for specific items ──
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 });
    }

    if (itemIds.length > 200) {
      return NextResponse.json({ error: 'Maximum 200 items per bulk operation' }, { status: 400 });
    }

    // Verify all items belong to the creator
    const items = await db.select()
      .from(cloudItems)
      .where(and(
        eq(cloudItems.creatorId, user.id),
        inArray(cloudItems.id, itemIds),
      ));

    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'Some items not found or not owned by you' }, { status: 400 });
    }

    if (action === 'set_status') {
      if (!status || !['private', 'live'].includes(status)) {
        return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
      }

      // If going live, check all items have prices
      if (status === 'live') {
        const unpriced = items.filter(i => !i.priceCoins);
        if (unpriced.length > 0) {
          return NextResponse.json({
            error: `${unpriced.length} items have no price. Price them first.`,
          }, { status: 400 });
        }
      }

      const updates: Record<string, any> = { status };
      if (status === 'live') {
        updates.publishedAt = new Date();
      }

      await db.update(cloudItems)
        .set(updates)
        .where(and(
          eq(cloudItems.creatorId, user.id),
          inArray(cloudItems.id, itemIds),
        ));

      return NextResponse.json({ updated: itemIds.length, action: 'set_status', status });
    }

    if (action === 'set_price') {
      if (typeof priceCoins !== 'number' || priceCoins < 0 || !Number.isInteger(priceCoins)) {
        return NextResponse.json({ error: 'priceCoins must be a positive integer' }, { status: 400 });
      }

      await db.update(cloudItems)
        .set({ priceCoins })
        .where(and(
          eq(cloudItems.creatorId, user.id),
          inArray(cloudItems.id, itemIds),
        ));

      return NextResponse.json({ updated: itemIds.length, action: 'set_price', priceCoins });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[CLOUD ITEMS BULK]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
