import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { vods } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { hasVODAccess } from '@/lib/vods/vod-access';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Get VOD details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vodId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { vodId } = await params;

    // Get VOD with creator info
    const vod = await db.query.vods.findFirst({
      where: eq(vods.id, vodId),
      with: {
        creator: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isCreatorVerified: true,
          },
        },
      },
    });

    if (!vod) {
      return NextResponse.json(
        { error: 'VOD not found' },
        { status: 404 }
      );
    }

    // Check access
    const accessCheck = await hasVODAccess({
      vodId,
      userId: user?.id || null,
    });

    return NextResponse.json({
      vod: {
        ...vod,
        creator: vod.creator,
      },
      access: accessCheck,
      isCreator: user?.id === vod.creatorId,
    });
  } catch (error: any) {
    console.error('[VOD Details] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch VOD details' },
      { status: 500 }
    );
  }
}
