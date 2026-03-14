import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, hubItems, hubPacks, hubPackItems, creatorPricingDefaults } from '@/lib/data/system';
import { eq, and, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Quick Sell: price and publish items in one action
 * Actions:
 *   - lock_individually: apply default prices, set status to live
 *   - lock_as_pack: create pack with default pricing, set items + pack to live
 *   - save_private: keep items private (no-op, but useful for the UI flow)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can use Quick Drop' }, { status: 403 });
    }

    const body = await request.json();
    const { action, itemIds, packTitle, packPrice } = body;

    if (!action || !itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'action and itemIds are required' }, { status: 400 });
    }

    // Verify items belong to creator
    const items = await db.select()
      .from(hubItems)
      .where(and(
        eq(hubItems.creatorId, user.id),
        inArray(hubItems.id, itemIds),
      ));

    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'Some items not found' }, { status: 400 });
    }

    // Get pricing defaults
    const defaults = await db.query.creatorPricingDefaults.findFirst({
      where: eq(creatorPricingDefaults.creatorId, user.id),
    });

    if (action === 'save_private') {
      return NextResponse.json({ action: 'save_private', items: items.length });
    }

    if (action === 'lock_individually') {
      if (!defaults || (!defaults.photoPriceCoins && !defaults.shortVideoPriceCoins && !defaults.longVideoPriceCoins)) {
        return NextResponse.json({ error: 'Set your default prices first' }, { status: 400 });
      }

      let priced = 0;
      const now = new Date();

      for (const item of items) {
        let price: number | null = item.priceCoins;

        // Apply default price if unpriced
        if (!price) {
          if (item.type === 'photo') {
            price = defaults.photoPriceCoins;
          } else if (item.type === 'video') {
            const isShort = (item.durationSeconds ?? 0) < 60;
            price = isShort ? defaults.shortVideoPriceCoins : defaults.longVideoPriceCoins;
          }
        }

        if (price) {
          await db.update(hubItems)
            .set({
              priceCoins: price,
              status: 'live',
              publishedAt: item.publishedAt || now,
            })
            .where(eq(hubItems.id, item.id));
          priced++;
        }
      }

      return NextResponse.json({
        action: 'lock_individually',
        priced,
        published: priced,
      });
    }

    if (action === 'lock_as_pack') {
      const title = packTitle || `Pack - ${new Date().toLocaleDateString()}`;

      // Calculate pack price
      let price = packPrice;
      if (!price && defaults) {
        // Sum individual default prices, apply discount
        let total = 0;
        for (const item of items) {
          if (item.type === 'photo') {
            total += defaults.photoPriceCoins || 0;
          } else if (item.type === 'video') {
            const isShort = (item.durationSeconds ?? 0) < 60;
            total += (isShort ? defaults.shortVideoPriceCoins : defaults.longVideoPriceCoins) || 0;
          }
        }
        const discount = defaults.packDiscountPct || 30;
        price = Math.round(total * (1 - discount / 100));
      }

      if (!price || price <= 0) {
        return NextResponse.json({ error: 'Could not determine pack price. Set default prices or provide packPrice.' }, { status: 400 });
      }

      // Create pack
      const [pack] = await db.insert(hubPacks).values({
        creatorId: user.id,
        title,
        priceCoins: price,
        status: 'live',
        itemCount: items.length,
      }).returning();

      // Add items to pack
      await db.insert(hubPackItems).values(
        items.map((item, index) => ({
          packId: pack.id,
          itemId: item.id,
          sortOrder: index,
        }))
      );

      // Set all items to live with default prices
      const now = new Date();
      for (const item of items) {
        let itemPrice = item.priceCoins;
        if (!itemPrice && defaults) {
          if (item.type === 'photo') {
            itemPrice = defaults.photoPriceCoins;
          } else {
            const isShort = (item.durationSeconds ?? 0) < 60;
            itemPrice = isShort ? defaults.shortVideoPriceCoins : defaults.longVideoPriceCoins;
          }
        }

        await db.update(hubItems)
          .set({
            priceCoins: itemPrice || price, // Fallback to pack price split
            status: 'live',
            publishedAt: item.publishedAt || now,
          })
          .where(eq(hubItems.id, item.id));
      }

      return NextResponse.json({
        action: 'lock_as_pack',
        pack,
        itemCount: items.length,
      });
    }

    return NextResponse.json({ error: 'Unknown action. Use lock_individually, lock_as_pack, or save_private.' }, { status: 400 });
  } catch (error: any) {
    console.error('[HUB QUICK SELL]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
