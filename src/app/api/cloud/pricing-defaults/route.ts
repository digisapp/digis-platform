import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, users, creatorPricingDefaults } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch creator's pricing defaults
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const defaults = await db.query.creatorPricingDefaults.findFirst({
      where: eq(creatorPricingDefaults.creatorId, user.id),
    });

    return NextResponse.json({
      defaults: defaults || {
        photoPriceCoins: null,
        shortVideoPriceCoins: null,
        longVideoPriceCoins: null,
        packDiscountPct: 30,
      },
    });
  } catch (error: any) {
    console.error('[CLOUD PRICING DEFAULTS GET]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

/**
 * PUT - Set/update creator's pricing defaults
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify creator role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can set pricing defaults' }, { status: 403 });
    }

    const body = await request.json();
    const { photoPriceCoins, shortVideoPriceCoins, longVideoPriceCoins, packDiscountPct } = body;

    // Validate prices are positive integers or null
    for (const [name, value] of Object.entries({ photoPriceCoins, shortVideoPriceCoins, longVideoPriceCoins })) {
      if (value !== null && value !== undefined && (typeof value !== 'number' || value < 0 || !Number.isInteger(value))) {
        return NextResponse.json({ error: `${name} must be a positive integer or null` }, { status: 400 });
      }
    }

    // Validate discount percentage
    if (packDiscountPct !== undefined && (typeof packDiscountPct !== 'number' || packDiscountPct < 0 || packDiscountPct > 100)) {
      return NextResponse.json({ error: 'packDiscountPct must be between 0 and 100' }, { status: 400 });
    }

    const values = {
      creatorId: user.id,
      photoPriceCoins: photoPriceCoins ?? null,
      shortVideoPriceCoins: shortVideoPriceCoins ?? null,
      longVideoPriceCoins: longVideoPriceCoins ?? null,
      packDiscountPct: packDiscountPct ?? 30,
      updatedAt: new Date(),
    };

    // Upsert pricing defaults
    const [defaults] = await db.insert(creatorPricingDefaults)
      .values(values)
      .onConflictDoUpdate({
        target: creatorPricingDefaults.creatorId,
        set: {
          photoPriceCoins: values.photoPriceCoins,
          shortVideoPriceCoins: values.shortVideoPriceCoins,
          longVideoPriceCoins: values.longVideoPriceCoins,
          packDiscountPct: values.packDiscountPct,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return NextResponse.json({ defaults });
  } catch (error: any) {
    console.error('[CLOUD PRICING DEFAULTS PUT]', { error: error.message });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
