import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContentService } from '@/lib/content/content-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawLibrary = await ContentService.getUserLibrary(user.id);

    // Transform the nested structure to flat structure expected by the page
    const library = rawLibrary.map((item: any) => ({
      id: item.content.id,
      title: item.content.title,
      description: item.content.description,
      contentType: item.content.contentType,
      thumbnailUrl: item.content.thumbnailUrl,
      mediaUrl: item.content.mediaUrl,
      viewCount: item.content.viewCount || 0,
      durationSeconds: item.content.durationSeconds,
      purchasedAt: item.purchase.unlockedAt,
      coinsSpent: item.purchase.coinsSpent || 0,
      creator: {
        id: item.creator.id,
        username: item.creator.username,
        displayName: item.creator.displayName,
        avatarUrl: item.creator.avatarUrl,
        isCreatorVerified: false, // Add this field if needed
      },
    }));

    return NextResponse.json({
      library,
      count: library.length,
    });
  } catch (error: any) {
    console.error('Error fetching library:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch library' },
      { status: 500 }
    );
  }
}
