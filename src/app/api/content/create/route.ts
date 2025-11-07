import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContentService } from '@/lib/content/content-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      contentType,
      unlockPrice,
      thumbnailUrl,
      mediaUrl,
      durationSeconds,
    } = body;

    // Validate required fields
    if (!title || !contentType || !thumbnailUrl || !mediaUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (unlockPrice === undefined || unlockPrice < 0) {
      return NextResponse.json(
        { error: 'Invalid unlock price' },
        { status: 400 }
      );
    }

    // Create content
    const content = await ContentService.createContent({
      creatorId: user.id,
      title,
      description,
      contentType,
      unlockPrice,
      thumbnailUrl,
      mediaUrl,
      durationSeconds,
    });

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create content' },
      { status: 500 }
    );
  }
}
