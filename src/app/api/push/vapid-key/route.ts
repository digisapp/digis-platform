import { NextResponse } from 'next/server';
import { PushNotificationService } from '@/lib/services/push-notification-service';

// GET /api/push/vapid-key - Get the public VAPID key for client-side subscription
export async function GET() {
  const vapidKey = PushNotificationService.getVapidPublicKey();

  if (!vapidKey) {
    return NextResponse.json(
      { error: 'Push notifications are not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({ vapidKey });
}
