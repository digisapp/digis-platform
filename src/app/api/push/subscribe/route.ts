import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PushNotificationService } from '@/lib/services/push-notification-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/push/subscribe - Subscribe to push notifications
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!PushNotificationService.isConfigured()) {
      return NextResponse.json(
        { error: 'Push notifications are not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { subscription } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') || undefined;

    const subscriptionId = await PushNotificationService.subscribe(
      user.id,
      subscription,
      userAgent
    );

    return NextResponse.json({
      success: true,
      subscriptionId,
    });
  } catch (error: any) {
    console.error('[push/subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    );
  }
}

// DELETE /api/push/subscribe - Unsubscribe from push notifications
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint) {
      await PushNotificationService.unsubscribe(user.id, endpoint);
    } else {
      // Unsubscribe all devices
      await PushNotificationService.unsubscribeAll(user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[push/subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    );
  }
}
