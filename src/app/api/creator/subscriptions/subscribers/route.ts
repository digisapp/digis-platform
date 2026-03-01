import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionService } from '@/lib/services/subscription-service';
import { db, users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Get list of subscribers for a creator
export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: 'Only creators can view subscribers' }, { status: 403 });
    }

    const subscribers = await SubscriptionService.getCreatorSubscribers(user.id);
    const stats = await SubscriptionService.getCreatorStats(user.id);

    return NextResponse.json({
      subscribers,
      stats,
    });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscribers' },
      { status: 500 }
    );
  }
}
