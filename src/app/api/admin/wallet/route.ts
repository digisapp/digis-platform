import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { wallets, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

// Admin-only: Get wallet balance for a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, username: true, displayName: true },
    });

    return NextResponse.json({
      user: targetUser,
      wallet: wallet || { balance: 0, heldBalance: 0 },
    });
  } catch (error: any) {
    console.error('[ADMIN WALLET GET]', error);
    return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 });
  }
}

// Admin-only: Set wallet balance for a user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, balance } = await request.json();

    if (!userId || balance === undefined) {
      return NextResponse.json({ error: 'userId and balance required' }, { status: 400 });
    }

    if (typeof balance !== 'number' || balance < 0) {
      return NextResponse.json({ error: 'balance must be a non-negative number' }, { status: 400 });
    }

    // Check if wallet exists
    const existingWallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });

    if (existingWallet) {
      // Update existing wallet
      await db
        .update(wallets)
        .set({ balance, updatedAt: new Date() })
        .where(eq(wallets.userId, userId));
    } else {
      // Create new wallet
      await db.insert(wallets).values({
        userId,
        balance,
        heldBalance: 0,
      });
    }

    console.log(`[ADMIN WALLET] Admin ${user.id} set balance for user ${userId} to ${balance}`);

    return NextResponse.json({
      success: true,
      userId,
      newBalance: balance,
    });
  } catch (error: any) {
    console.error('[ADMIN WALLET POST]', error);
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 });
  }
}
