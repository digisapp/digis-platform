import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { creatorSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/creator/[creatorId]/rate - Get creator's message rate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const settings = await db.query.creatorSettings.findFirst({
      where: eq(creatorSettings.userId, creatorId),
      columns: {
        messageRate: true,
      },
    });

    return NextResponse.json({
      messageRate: settings?.messageRate || 0,
    });
  } catch (error) {
    console.error('Error fetching creator rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rate', messageRate: 0 },
      { status: 500 }
    );
  }
}
