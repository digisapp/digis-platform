import webpush from 'web-push';
import { db } from '@/lib/data/system';
import { pushSubscriptions, notificationPreferences, notifications } from '@/lib/data/system';
import { eq, and } from 'drizzle-orm';

/**
 * Push Notification Service
 *
 * Handles Web Push notifications for browser/PWA notifications.
 * Works alongside the existing in-app notification system.
 *
 * Environment variables required:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY: Public VAPID key for client
 * - VAPID_PRIVATE_KEY: Private VAPID key for server
 * - VAPID_SUBJECT: mailto: or https: URL for VAPID
 */

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@digis.app';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('[PushNotificationService] VAPID keys not configured. Push notifications disabled.');
}

export type NotificationType = 'message' | 'tip' | 'follow' | 'call' | 'stream' | 'gift' | 'system' | 'earnings' | 'purchase';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: NotificationType;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class PushNotificationService {
  /**
   * Check if push notifications are configured
   */
  static isConfigured(): boolean {
    return !!(vapidPublicKey && vapidPrivateKey);
  }

  /**
   * Get the public VAPID key for client-side subscription
   */
  static getVapidPublicKey(): string | null {
    return vapidPublicKey || null;
  }

  /**
   * Subscribe a user to push notifications
   */
  static async subscribe(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    userAgent?: string
  ) {
    // Check if this endpoint already exists
    const existing = await db.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, subscription.endpoint),
    });

    if (existing) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
          lastUsedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing.id));

      return existing.id;
    }

    // Create new subscription
    const [newSub] = await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      })
      .returning();

    return newSub.id;
  }

  /**
   * Unsubscribe a user from push notifications
   */
  static async unsubscribe(userId: string, endpoint: string) {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      );
  }

  /**
   * Unsubscribe all devices for a user
   */
  static async unsubscribeAll(userId: string) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  /**
   * Check if user has push notifications enabled for a specific type
   */
  static async shouldSendPush(userId: string, type: NotificationType): Promise<boolean> {
    if (!this.isConfigured()) return false;

    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    // Default to enabled if no preferences set
    if (!prefs) return true;

    // Check if push is globally disabled
    if (!prefs.pushEnabled) return false;

    // Check specific type
    switch (type) {
      case 'message':
        return prefs.pushMessages;
      case 'call':
        return prefs.pushCalls;
      case 'stream':
        return prefs.pushStreams;
      case 'tip':
      case 'gift':
      case 'earnings':
        return prefs.pushTips;
      case 'follow':
        return prefs.pushFollows;
      case 'system':
        return true; // Always send system notifications
      default:
        return true;
    }
  }

  /**
   * Check if it's currently quiet hours for the user
   */
  static async isQuietHours(userId: string): Promise<boolean> {
    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    if (!prefs || !prefs.quietHoursEnabled) return false;

    const now = new Date();
    const userTimezone = prefs.timezone || 'UTC';

    // Get current time in user's timezone
    const userTime = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const [currentHour, currentMinute] = userTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = (prefs.quietHoursStart || '22:00').split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = (prefs.quietHoursEnd || '08:00').split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Send push notification to a user
   */
  static async sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.isConfigured()) {
      console.warn('[PushNotificationService] Not configured, skipping push');
      return 0;
    }

    // Get all subscriptions for user
    const subs = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, userId),
    });

    if (subs.length === 0) return 0;

    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload),
          {
            TTL: 60 * 60, // 1 hour
          }
        );

        // Update last used timestamp
        await db
          .update(pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));

        successCount++;
      } catch (error: any) {
        console.error('[PushNotificationService] Failed to send push:', error.message);

        // If subscription is invalid/expired, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          failedEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      for (const endpoint of failedEndpoints) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
      }
    }

    return successCount;
  }

  /**
   * Send push notification with preference and quiet hours check
   */
  static async sendNotification(
    userId: string,
    type: NotificationType,
    payload: PushPayload
  ): Promise<{ sent: boolean; reason?: string }> {
    // Check if push should be sent
    const shouldSend = await this.shouldSendPush(userId, type);
    if (!shouldSend) {
      return { sent: false, reason: 'disabled_by_preference' };
    }

    // Check quiet hours (skip for calls - those are urgent)
    if (type !== 'call') {
      const isQuiet = await this.isQuietHours(userId);
      if (isQuiet) {
        return { sent: false, reason: 'quiet_hours' };
      }
    }

    // Add type to payload data
    payload.data = { ...payload.data, type };

    const sentCount = await this.sendPushToUser(userId, payload);
    return { sent: sentCount > 0 };
  }

  /**
   * Get user's notification preferences
   */
  static async getPreferences(userId: string) {
    const prefs = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    // Return defaults if no preferences exist
    if (!prefs) {
      return {
        pushEnabled: true,
        pushMessages: true,
        pushCalls: true,
        pushStreams: true,
        pushTips: true,
        pushFollows: true,
        emailEnabled: true,
        emailDigest: 'daily',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
      };
    }

    return prefs;
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(
    userId: string,
    updates: Partial<{
      pushEnabled: boolean;
      pushMessages: boolean;
      pushCalls: boolean;
      pushStreams: boolean;
      pushTips: boolean;
      pushFollows: boolean;
      emailEnabled: boolean;
      emailDigest: string;
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
      timezone: string;
    }>
  ) {
    const existing = await db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });

    if (existing) {
      await db
        .update(notificationPreferences)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(notificationPreferences.userId, userId));
    } else {
      await db.insert(notificationPreferences).values({
        userId,
        ...updates,
      });
    }
  }
}
