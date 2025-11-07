import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, creatorBankingInfo } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/wallet/banking-info - Get creator's banking info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const banking = await db.query.creatorBankingInfo.findFirst({
      where: eq(creatorBankingInfo.creatorId, user.id),
    });

    if (!banking) {
      return NextResponse.json({ bankingInfo: null });
    }

    return NextResponse.json({
      bankingInfo: {
        id: banking.id,
        accountHolderName: banking.accountHolderName,
        accountType: banking.accountType,
        bankName: banking.bankName,
        lastFourDigits: banking.accountNumber.slice(-4),
        isVerified: banking.isVerified === 1,
      }
    });
  } catch (error: any) {
    console.error('Error fetching banking info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch banking info' },
      { status: 500 }
    );
  }
}

// POST /api/wallet/banking-info - Add or update banking info
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountHolderName, accountType, routingNumber, accountNumber, bankName } = await request.json();

    // Validate required fields
    if (!accountHolderName || !accountType || !routingNumber || !accountNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if banking info already exists
    const existing = await db.query.creatorBankingInfo.findFirst({
      where: eq(creatorBankingInfo.creatorId, user.id),
    });

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(creatorBankingInfo)
        .set({
          accountHolderName,
          accountType,
          routingNumber,
          accountNumber, // In production, this should be encrypted
          bankName,
          isVerified: 0, // Reset verification on update
          updatedAt: new Date(),
        })
        .where(eq(creatorBankingInfo.id, existing.id))
        .returning();

      return NextResponse.json({
        success: true,
        bankingInfo: {
          id: updated.id,
          accountHolderName: updated.accountHolderName,
          accountType: updated.accountType,
          bankName: updated.bankName,
          lastFourDigits: updated.accountNumber.slice(-4),
          isVerified: updated.isVerified === 1,
        }
      });
    } else {
      // Create new
      const [created] = await db
        .insert(creatorBankingInfo)
        .values({
          creatorId: user.id,
          accountHolderName,
          accountType,
          routingNumber,
          accountNumber, // In production, this should be encrypted
          bankName,
        })
        .returning();

      return NextResponse.json({
        success: true,
        bankingInfo: {
          id: created.id,
          accountHolderName: created.accountHolderName,
          accountType: created.accountType,
          bankName: created.bankName,
          lastFourDigits: created.accountNumber.slice(-4),
          isVerified: created.isVerified === 1,
        }
      }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error saving banking info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save banking info' },
      { status: 500 }
    );
  }
}
