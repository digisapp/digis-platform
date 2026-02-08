import { NextResponse } from 'next/server';
import { db, payoutRequests, creatorBankingInfo, users, creatorPayoneerInfo } from '@/lib/data/system';
import { eq, desc, count, sql } from 'drizzle-orm';
import { getLastFourDigits, decrypt } from '@/lib/crypto/encryption';
import { withAdmin } from '@/lib/auth/withAdmin';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/payouts - Get all payout requests (admin only)
export const GET = withAdmin(async ({ request }) => {
  try {
    // Get filter from query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'pending';

    // Fetch payout requests with creator info and Payoneer info
    let payoutsQuery = db
      .select({
        payout: payoutRequests,
        creator: users,
        banking: creatorBankingInfo,
        payoneer: creatorPayoneerInfo,
      })
      .from(payoutRequests)
      .leftJoin(users, eq(payoutRequests.creatorId, users.id))
      .leftJoin(creatorBankingInfo, eq(payoutRequests.bankingInfoId, creatorBankingInfo.id))
      .leftJoin(creatorPayoneerInfo, eq(payoutRequests.creatorId, creatorPayoneerInfo.creatorId))
      .orderBy(desc(payoutRequests.requestedAt))
      .$dynamic();

    if (filter === 'pending') {
      payoutsQuery = payoutsQuery.where(eq(payoutRequests.status, 'pending'));
    }

    // Run filtered list + total stats in parallel
    const [results, statusCounts] = await Promise.all([
      payoutsQuery,
      db.select({
        status: payoutRequests.status,
        count: count(),
      })
        .from(payoutRequests)
        .groupBy(payoutRequests.status),
    ]);

    const stats: Record<string, number> = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 };
    statusCounts.forEach(row => { stats[row.status] = row.count; });

    // Helper to safely decrypt account number
    const decryptAccountNumber = (encrypted: string): string => {
      try {
        if (encrypted.includes(':')) {
          return decrypt(encrypted);
        }
        return encrypted; // Legacy plain text
      } catch {
        return '****DECRYPTION_FAILED****';
      }
    };

    const payouts = results.map((row) => ({
      id: row.payout.id,
      creatorId: row.payout.creatorId,
      creatorUsername: row.creator?.username || 'Unknown',
      creatorDisplayName: row.creator?.displayName || row.creator?.username || 'Unknown',
      creatorEmail: row.creator?.email || 'Unknown',
      amount: row.payout.amount,
      status: row.payout.status,
      payoutMethod: row.payout.payoutMethod,
      payoneerPaymentId: row.payout.payoneerPaymentId,
      externalReference: row.payout.externalReference,
      providerStatus: row.payout.providerStatus,
      bankingInfo: row.banking ? {
        accountHolderName: row.banking.accountHolderName,
        bankName: row.banking.bankName,
        accountType: row.banking.accountType,
        routingNumber: row.banking.routingNumber,
        accountNumber: decryptAccountNumber(row.banking.accountNumber),
        lastFourDigits: getLastFourDigits(row.banking.accountNumber),
        isVerified: row.banking.isVerified === 1,
      } : null,
      payoneerInfo: row.payoneer ? {
        payeeId: row.payoneer.payeeId,
        payeeStatus: row.payoneer.payeeStatus,
        preferredCurrency: row.payoneer.preferredCurrency,
      } : null,
      requestedAt: row.payout.requestedAt,
      processedAt: row.payout.processedAt,
      completedAt: row.payout.completedAt,
      failureReason: row.payout.failureReason,
      adminNotes: row.payout.adminNotes,
    }));

    return NextResponse.json({ payouts, stats });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payouts';
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
