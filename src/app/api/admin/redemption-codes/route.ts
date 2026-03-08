import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/withAdmin';
import { db, redemptionCodes } from '@/lib/data/system';
import { eq, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Generate a unique readable code like "DIGIS-7X3K"
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[crypto.randomInt(chars.length)];
  }
  return `DIGIS-${suffix}`;
}

/**
 * GET /api/admin/redemption-codes
 * List all codes, optionally filtered by batch
 */
export const GET = withAdmin(async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const batch = searchParams.get('batch');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 50;
  const offset = (page - 1) * limit;

  const conditions = batch ? eq(redemptionCodes.batchName, batch) : undefined;

  const [codes, countResult] = await Promise.all([
    db.query.redemptionCodes.findMany({
      where: conditions,
      orderBy: [desc(redemptionCodes.createdAt)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(redemptionCodes)
      .where(conditions || sql`true`),
  ]);

  // Get batch stats
  const batchStats = await db.select({
    batchName: redemptionCodes.batchName,
    total: sql<number>`count(*)`,
    redeemed: sql<number>`count(*) filter (where ${redemptionCodes.isRedeemed} = true)`,
  })
    .from(redemptionCodes)
    .groupBy(redemptionCodes.batchName);

  return NextResponse.json({
    codes,
    total: Number(countResult[0]?.count || 0),
    page,
    batches: batchStats,
  });
});

/**
 * POST /api/admin/redemption-codes
 * Generate a batch of unique codes
 *
 * Body: { count: number, coinAmount: number, batchName: string, expiresAt?: string }
 */
export const POST = withAdmin(async ({ request }) => {
  const body = await request.json();
  const { count, coinAmount, batchName, expiresAt } = body;

  if (!count || count < 1 || count > 1000) {
    return NextResponse.json({ error: 'Count must be between 1 and 1000' }, { status: 400 });
  }

  if (!coinAmount || coinAmount < 1) {
    return NextResponse.json({ error: 'Coin amount must be at least 1' }, { status: 400 });
  }

  if (!batchName || typeof batchName !== 'string') {
    return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
  }

  // Generate unique codes
  const generatedCodes: string[] = [];
  const existingCodes = new Set(
    (await db.select({ code: redemptionCodes.code }).from(redemptionCodes))
      .map(r => r.code)
  );

  while (generatedCodes.length < count) {
    const code = generateCode();
    if (!existingCodes.has(code) && !generatedCodes.includes(code)) {
      generatedCodes.push(code);
    }
  }

  // Insert all codes
  const values = generatedCodes.map(code => ({
    code,
    coinAmount,
    batchName,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }));

  await db.insert(redemptionCodes).values(values);

  return NextResponse.json({
    success: true,
    count: generatedCodes.length,
    batchName,
    coinAmount,
    codes: generatedCodes,
  });
});
