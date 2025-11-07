import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/wallet/wallet-service';

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

    let balance = 0;
    let availableBalance = 0;

    try {
      balance = await WalletService.getBalance(user.id);
      availableBalance = await WalletService.getAvailableBalance(user.id);
    } catch (dbError) {
      console.error('Database error - returning zero balance:', dbError);
      // Return zero balance if database fails - better than crashing
    }

    return NextResponse.json({
      balance,
      availableBalance,
      heldBalance: balance - availableBalance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    // Return zero balance instead of error to prevent navigation crash
    return NextResponse.json({
      balance: 0,
      availableBalance: 0,
      heldBalance: 0,
    });
  }
}
