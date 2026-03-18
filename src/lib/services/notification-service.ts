import { db } from '@/lib/data/system';
import { notifications, follows, subscriptions, users } from '@/lib/data/system';
import { eq, and, sql } from 'drizzle-orm';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { PushNotificationService, NotificationType } from './push-notification-service';

/**
 * NotificationService handles creating and sending notifications to users
 *
 * This service:
 * 1. Stores notifications in the database
 * 2. Broadcasts via Supabase Realtime (for in-app notifications)
 * 3. Sends Web Push notifications (for browser/device notifications)
 */
export class NotificationService {
  /**
   * Send a notification to a single user
   * Handles both in-app and push notifications
   */
  static async sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    actionUrl?: string,
    imageUrl?: string,
    metadata?: any
  ) {
    // 1. Store in database
    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        actionUrl,
        imageUrl,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      })
      .returning();

    // 2. Broadcast real-time notification via Ably
    // This will be picked up by the user's notification listener
    await AblyRealtimeService.broadcastNotification(userId, notification);

    // 3. Send Web Push notification (async, non-blocking)
    this.sendPushNotification(userId, type as NotificationType, {
      title,
      body: message,
      icon: imageUrl || '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: actionUrl || '/',
        type: type as NotificationType,
        notificationId: notification.id,
        ...metadata,
      },
    }).catch(err => {
      console.error('[NotificationService] Push notification failed:', err);
    });

    return notification;
  }

  /**
   * Send a push notification (internal helper)
   */
  private static async sendPushNotification(
    userId: string,
    type: NotificationType,
    payload: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      image?: string;
      data?: any;
      actions?: Array<{ action: string; title: string; icon?: string }>;
    }
  ) {
    // Add type-specific actions
    const actions = this.getActionsForType(type);
    if (actions.length > 0) {
      payload.actions = actions;
    }

    return PushNotificationService.sendNotification(userId, type, payload);
  }

  /**
   * Get notification actions based on type
   */
  private static getActionsForType(type: NotificationType): Array<{ action: string; title: string }> {
    switch (type) {
      case 'call':
        return [
          { action: 'answer', title: 'Answer' },
          { action: 'dismiss', title: 'Decline' },
        ];
      case 'message':
        return [
          { action: 'view', title: 'View' },
        ];
      case 'stream':
        return [
          { action: 'view', title: 'Watch' },
        ];
      default:
        return [];
    }
  }

  /**
   * Notify all followers when a creator goes live
   */
  static async notifyFollowersOfStream(
    creatorId: string,
    streamId: string,
    streamTitle: string,
    creatorName: string,
    creatorAvatarUrl: string | null,
    privacy: string
  ) {
    // Only notify followers if stream is public or followers-only
    // Don't spam followers about subscribers-only streams
    if (privacy !== 'public' && privacy !== 'followers') {
      return;
    }

    // Get followers with a safety cap to prevent unbounded queries
    const followers = await db.query.follows.findMany({
      where: eq(follows.followingId, creatorId),
      columns: { followerId: true },
      limit: 10000,
    });

    if (followers.length === 0) return;

    // Process followers in batches of 100 using allSettled so one failure doesn't kill the batch
    const BATCH_SIZE = 100;
    let notified = 0;

    for (let i = 0; i < followers.length; i += BATCH_SIZE) {
      const batch = followers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((follow) =>
          this.sendNotification(
            follow.followerId,
            'stream',
            `${creatorName} is live! 🔴`,
            streamTitle,
            `/stream/${streamId}`,
            creatorAvatarUrl || undefined,
            {
              creatorId,
              streamId,
              privacy,
            }
          )
        )
      );
      notified += results.filter(r => r.status === 'fulfilled').length;
    }

    console.log(`Notified ${notified}/${followers.length} followers about stream ${streamId}`);
  }

  /**
   * Notify all active subscribers when a creator goes live with a subscribers-only stream
   */
  static async notifySubscribersOfStream(
    creatorId: string,
    streamId: string,
    streamTitle: string,
    creatorName: string,
    creatorAvatarUrl: string | null
  ) {
    // Get all active subscribers of this creator
    const activeSubscribers = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.creatorId, creatorId),
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.expiresAt} > NOW()`
      ),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (activeSubscribers.length === 0) return;

    // Send notification to each subscriber
    const notificationPromises = activeSubscribers.map((subscription) =>
      this.sendNotification(
        subscription.userId,
        'stream',
        `${creatorName} is live! 🔴 (Subscribers Only)`,
        `${streamTitle} - Exclusive for subscribers`,
        `/stream/${streamId}`,
        creatorAvatarUrl || undefined,
        {
          creatorId,
          streamId,
          privacy: 'subscribers',
          subscriberOnly: true,
        }
      )
    );

    await Promise.all(notificationPromises);

    console.log(`Notified ${activeSubscribers.length} subscribers about stream ${streamId}`);
  }

  /**
   * Notify appropriate users when a stream starts based on privacy level
   */
  static async notifyStreamStart(
    creatorId: string,
    streamId: string,
    streamTitle: string,
    privacy: string
  ) {
    // Get creator details
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
      columns: {
        displayName: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!creator) {
      console.error('Creator not found for notifications');
      return;
    }

    const creatorName = creator.displayName || creator.username || 'A creator';

    // Send notifications based on privacy level
    switch (privacy) {
      case 'public':
        // Notify all followers for public streams
        await this.notifyFollowersOfStream(
          creatorId,
          streamId,
          streamTitle,
          creatorName,
          creator.avatarUrl,
          privacy
        );
        break;

      case 'followers':
        // Notify all followers for followers-only streams
        await this.notifyFollowersOfStream(
          creatorId,
          streamId,
          streamTitle,
          creatorName,
          creator.avatarUrl,
          privacy
        );
        break;

      case 'subscribers':
        // Only notify active subscribers for subscribers-only streams
        await this.notifySubscribersOfStream(
          creatorId,
          streamId,
          streamTitle,
          creatorName,
          creator.avatarUrl
        );
        break;

      default:
        console.log(`Unknown privacy level: ${privacy}. No notifications sent.`);
    }
  }

  /**
   * Notify all followers when a creator drops new Cloud content
   */
  static async notifyFollowersOfDrop(
    creatorId: string,
    item: { id: string; type: string; priceCoins: number | null }
  ) {
    const creator = await db.query.users.findFirst({
      where: eq(users.id, creatorId),
      columns: { displayName: true, username: true, avatarUrl: true },
    });

    if (!creator) return;

    const creatorName = creator.displayName || creator.username || 'A creator';
    const contentType = item.type === 'video' ? 'video' : 'photo';

    // Get followers with a safety cap to prevent unbounded queries
    const followerList = await db.query.follows.findMany({
      where: eq(follows.followingId, creatorId),
      columns: { followerId: true },
      limit: 10000,
    });

    if (followerList.length === 0) return;

    // Process followers in batches of 100 using allSettled so one failure doesn't kill the batch
    const BATCH_SIZE = 100;
    let notified = 0;

    for (let i = 0; i < followerList.length; i += BATCH_SIZE) {
      const batch = followerList.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(f =>
          this.sendNotification(
            f.followerId,
            'gift', // Reuse existing notification type
            `${creatorName} dropped new content`,
            `New ${contentType} available${item.priceCoins ? ` · ${item.priceCoins} coins` : ''}`,
            `/profile/${creator.username}`,
            creator.avatarUrl || undefined,
            { creatorId, itemId: item.id, type: 'cloud_drop' }
          )
        )
      );
      notified += results.filter(r => r.status === 'fulfilled').length;
    }

    console.log(`[Cloud] Notified ${notified}/${followerList.length} followers for creator ${creatorId}`);
  }
}
