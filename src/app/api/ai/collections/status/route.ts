import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, aiTwinSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ai/collections/status
 * Get the sync status of the creator's xAI collection
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify creator role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    if (!dbUser || dbUser.role !== 'creator') {
      return NextResponse.json({ error: 'Only creators can view collection status' }, { status: 403 });
    }

    const settings = await db.query.aiTwinSettings.findFirst({
      where: eq(aiTwinSettings.creatorId, user.id),
      columns: {
        xaiCollectionId: true,
        collectionSyncedAt: true,
      },
    });

    return NextResponse.json({
      hasCollection: !!settings?.xaiCollectionId,
      lastSyncedAt: settings?.collectionSyncedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('[AI Collections Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get collection status' },
      { status: 500 }
    );
  }
}
