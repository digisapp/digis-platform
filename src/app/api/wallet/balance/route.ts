import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Single DB query with timeout
    let balance = 0;
    let heldBalance = 0;

    try {
      const wallet = await Promise.race([
        db.query.wallets.findFirst({
          where: eq(wallets.userId, user.id),
          columns: { balance: true, heldBalance: true },
        }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Wallet query timeout')), 3000)
        ),
      ]);

      if (wallet) {
        balance = wallet.balance || 0;
        heldBalance = wallet.heldBalance || 0;
      }
    } catch (dbError) {
      console.error('Database error - returning zero balance:', dbError);
    }

    return NextResponse.json({
      balance,
      availableBalance: balance - heldBalance,
      heldBalance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({
      balance: 0,
      availableBalance: 0,
      heldBalance: 0,
    });
  }
}
