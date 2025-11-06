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

    const balance = await WalletService.getBalance(user.id);
    const availableBalance = await WalletService.getAvailableBalance(user.id);

    return NextResponse.json({
      balance,
      availableBalance,
      heldBalance: balance - availableBalance,
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
