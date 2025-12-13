import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { tipMenuItems } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tip-menu/[creatorId]
 * Get active tip menu items for a creator (public endpoint for fans)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const items = await db.query.tipMenuItems.findMany({
      where: and(
        eq(tipMenuItems.creatorId, creatorId),
        eq(tipMenuItems.isActive, true)
      ),
      orderBy: [asc(tipMenuItems.displayOrder), asc(tipMenuItems.createdAt)],
      columns: {
        id: true,
        label: true,
        emoji: true,
        price: true,
        description: true,
      },
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Error fetching tip menu:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tip menu' },
      { status: 500 }
    );
  }
}
