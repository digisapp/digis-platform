import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { contentItems } from '@/lib/data/system';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse limit from query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Direct query instead of using ContentService to avoid relation issues
    const content = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.creatorId, user.id))
      .orderBy(desc(contentItems.createdAt))
      .limit(limit);

    return NextResponse.json({
      content,
      count: content.length,
    });
  } catch (error: any) {
    console.error('Error fetching creator content:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch content', content: [], count: 0 },
      { status: 500 }
    );
  }
}
