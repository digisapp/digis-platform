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
    totalRedemptions: sql<number>`sum(${redemptionCodes.redemptionCount})`,
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
 * Generate codes or create a single multi-use code
 *
 * For multi-use (same code on every coin):
 *   { code: "DIGIS-SHOW", coinAmount: 500, batchName: "LA Show", maxRedemptions: 200 }
 *
 * For unique codes (different code per coin):
 *   { count: 200, coinAmount: 500, batchName: "LA Show" }
 */
export const POST = withAdmin(async ({ request }) => {
  const body = await request.json();
  const { code, count, coinAmount, batchName, maxRedemptions, expiresAt } = body;

  if (!coinAmount || coinAmount < 1) {
    return NextResponse.json({ error: 'Coin amount must be at least 1' }, { status: 400 });
  }

  if (!batchName || typeof batchName !== 'string') {
    return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
  }

  // Single multi-use code
  if (code) {
    const normalizedCode = code.trim().toUpperCase();

    // Check if code already exists
    const existing = await db.query.redemptionCodes.findFirst({
      where: eq(redemptionCodes.code, normalizedCode),
    });

    if (existing) {
      return NextResponse.json({ error: 'Code already exists' }, { status: 409 });
    }

    await db.insert(redemptionCodes).values({
      code: normalizedCode,
      coinAmount,
      batchName,
      maxRedemptions: maxRedemptions || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return NextResponse.json({
      success: true,
      count: 1,
      batchName,
      coinAmount,
      maxRedemptions: maxRedemptions || 'unlimited',
      codes: [normalizedCode],
    });
  }

  // Batch of unique codes
  if (!count || count < 1 || count > 1000) {
    return NextResponse.json({ error: 'Count must be between 1 and 1000' }, { status: 400 });
  }

  const generatedCodes: string[] = [];
  const existingCodes = new Set(
    (await db.select({ code: redemptionCodes.code }).from(redemptionCodes))
      .map(r => r.code)
  );

  while (generatedCodes.length < count) {
    const newCode = generateCode();
    if (!existingCodes.has(newCode) && !generatedCodes.includes(newCode)) {
      generatedCodes.push(newCode);
    }
  }

  const values = generatedCodes.map(c => ({
    code: c,
    coinAmount,
    batchName,
    maxRedemptions: maxRedemptions ?? 1, // Default: single-use for unique codes
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
