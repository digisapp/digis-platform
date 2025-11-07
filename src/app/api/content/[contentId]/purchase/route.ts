import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContentService } from '@/lib/content/content-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ContentService.purchaseContent(user.id, contentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      purchase: result.purchase,
      message: 'Content unlocked successfully!',
    });
  } catch (error: any) {
    console.error('Error purchasing content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purchase content' },
      { status: 500 }
    );
  }
}
