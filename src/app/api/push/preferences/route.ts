import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PushNotificationService } from '@/lib/services/push-notification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/push/preferences - Get notification preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await PushNotificationService.getPreferences(user.id);

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[push/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

// PATCH /api/push/preferences - Update notification preferences
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();

    // Validate updates
    const validKeys = [
      'pushEnabled',
      'pushMessages',
      'pushCalls',
      'pushStreams',
      'pushTips',
      'pushFollows',
      'emailEnabled',
      'emailDigest',
      'quietHoursEnabled',
      'quietHoursStart',
      'quietHoursEnd',
      'timezone',
    ];

    const sanitizedUpdates: Record<string, any> = {};
    for (const key of validKeys) {
      if (key in updates) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    await PushNotificationService.updatePreferences(user.id, sanitizedUpdates);

    const preferences = await PushNotificationService.getPreferences(user.id);

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[push/preferences] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
