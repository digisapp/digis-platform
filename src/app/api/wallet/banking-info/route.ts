import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db, creatorBankingInfo } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { encrypt, getLastFourDigits } from '@/lib/crypto/encryption';
import { bankingInfoSchema, validateBody } from '@/lib/validation/schemas';
import { withOriginGuard } from '@/lib/security/withOriginGuard';

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
        lastFourDigits: getLastFourDigits(banking.accountNumber),
        isVerified: banking.isVerified === 1,
      }
    });
  } catch (error) {
    console.error('Error fetching banking info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banking info. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/wallet/banking-info - Add or update banking info
// Protected with Origin/Referer validation for CSRF mitigation
export const POST = withOriginGuard(async (request: Request) => {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input with Zod
    const validation = await validateBody(request, bankingInfoSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { accountHolderName, accountType, routingNumber, accountNumber, bankName } = validation.data;

    // Check if banking info already exists
    const existing = await db.query.creatorBankingInfo.findFirst({
      where: eq(creatorBankingInfo.creatorId, user.id),
    });

    // Encrypt account number before storing
    const encryptedAccountNumber = encrypt(accountNumber);
    const encryptedRoutingNumber = encrypt(routingNumber);

    // Get last 4 digits from the ORIGINAL (unencrypted) account number
    // This is more efficient than decrypting what we just encrypted
    const lastFourDigits = accountNumber.slice(-4);

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(creatorBankingInfo)
        .set({
          accountHolderName,
          accountType,
          routingNumber: encryptedRoutingNumber,
          accountNumber: encryptedAccountNumber,
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
          lastFourDigits, // Use original value directly
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
          routingNumber: encryptedRoutingNumber,
          accountNumber: encryptedAccountNumber,
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
          lastFourDigits, // Use original value directly
          isVerified: created.isVerified === 1,
        }
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving banking info:', error);
    return NextResponse.json(
      { error: 'Failed to save banking info. Please try again.' },
      { status: 500 }
    );
  }
});
