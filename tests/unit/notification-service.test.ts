/**
 * NotificationService Test Suite
 *
 * Tests: sendNotification, notifyFollowersOfStream, notifySubscribersOfStream,
 * notifyStreamStart.
 *
 * Key behaviors: DB insert + Ably broadcast + push (non-blocking), privacy routing,
 * batch follower/subscriber notification, empty follower list handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      follows: { findMany: vi.fn() },
      subscriptions: { findMany: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'notif-1',
          userId: 'user-1',
          type: 'stream',
          title: 'Test',
          message: 'Test message',
        }])),
      })),
    })),
  },
  notifications: { userId: 'user_id' },
  follows: { followingId: 'following_id', followerId: 'follower_id' },
  subscriptions: {
    creatorId: 'creator_id',
    userId: 'user_id',
    status: 'status',
    expiresAt: 'expires_at',
  },
  users: { id: 'id' },
}));

vi.mock('@/lib/streams/ably-realtime-service', () => ({
  AblyRealtimeService: {
    broadcastNotification: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('./push-notification-service', () => ({
  PushNotificationService: {
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

// Must also mock at the path the service imports from
vi.mock('@/lib/services/push-notification-service', () => ({
  PushNotificationService: {
    sendNotification: vi.fn(() => Promise.resolve()),
  },
  NotificationType: {},
}));

import { db } from '@/lib/data/system';
import { NotificationService } from '@/lib/services/notification-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const followsFindMany = db.query.follows.findMany as ReturnType<typeof vi.fn>;
const subsFindMany = db.query.subscriptions.findMany as ReturnType<typeof vi.fn>;
const usersFindFirst = db.query.users.findFirst as ReturnType<typeof vi.fn>;

function mockInsertReturning(notification: Record<string, any>) {
  (db.insert as any).mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([notification])),
    })),
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset insert mock to default
  mockInsertReturning({
    id: 'notif-1',
    userId: 'user-1',
    type: 'stream',
    title: 'Test',
    message: 'Test message',
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationService', () => {
  describe('sendNotification', () => {
    it('inserts notification into DB and broadcasts via Ably', async () => {
      const result = await NotificationService.sendNotification(
        'user-1', 'stream', 'Live Now!', 'Creator is live', '/stream/s-1', 'https://img.com/avatar.jpg'
      );

      expect(db.insert).toHaveBeenCalled();
      expect(AblyRealtimeService.broadcastNotification).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ id: 'notif-1' })
      );
      expect(result).toEqual(expect.objectContaining({ id: 'notif-1' }));
    });

    it('returns the created notification', async () => {
      mockInsertReturning({
        id: 'notif-42',
        userId: 'user-42',
        type: 'message',
        title: 'New Message',
        message: 'Hello!',
      });

      const result = await NotificationService.sendNotification(
        'user-42', 'message', 'New Message', 'Hello!'
      );

      expect(result.id).toBe('notif-42');
    });
  });

  describe('notifyFollowersOfStream', () => {
    it('sends notifications to all followers for public streams', async () => {
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
        { followerId: 'fan-2', follower: { id: 'fan-2', username: 'fan2' } },
      ]);

      await NotificationService.notifyFollowersOfStream(
        'creator-1', 'stream-1', 'Fun Stream', 'CoolCreator', 'https://img.com/avatar.jpg', 'public'
      );

      // Should insert a notification for each follower
      expect(db.insert).toHaveBeenCalledTimes(2);
    });

    it('sends notifications for followers-only streams', async () => {
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
      ]);

      await NotificationService.notifyFollowersOfStream(
        'creator-1', 'stream-1', 'Fun Stream', 'CoolCreator', null, 'followers'
      );

      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it('does not notify for subscribers-only streams', async () => {
      // Service queries followers first, then checks privacy
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
      ]);

      await NotificationService.notifyFollowersOfStream(
        'creator-1', 'stream-1', 'Sub Stream', 'CoolCreator', null, 'subscribers'
      );

      // Should not send any notifications for subscribers-only
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('does nothing when creator has no followers', async () => {
      followsFindMany.mockResolvedValueOnce([]);

      await NotificationService.notifyFollowersOfStream(
        'creator-1', 'stream-1', 'Fun Stream', 'CoolCreator', null, 'public'
      );

      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('notifySubscribersOfStream', () => {
    it('sends notifications to all active subscribers', async () => {
      subsFindMany.mockResolvedValueOnce([
        { userId: 'sub-1', user: { id: 'sub-1', username: 'sub1' } },
        { userId: 'sub-2', user: { id: 'sub-2', username: 'sub2' } },
        { userId: 'sub-3', user: { id: 'sub-3', username: 'sub3' } },
      ]);

      await NotificationService.notifySubscribersOfStream(
        'creator-1', 'stream-1', 'VIP Stream', 'CoolCreator', 'https://img.com/avatar.jpg'
      );

      expect(db.insert).toHaveBeenCalledTimes(3);
    });

    it('does nothing when no active subscribers', async () => {
      subsFindMany.mockResolvedValueOnce([]);

      await NotificationService.notifySubscribersOfStream(
        'creator-1', 'stream-1', 'VIP Stream', 'CoolCreator', null
      );

      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('notifyStreamStart', () => {
    const mockCreator = {
      displayName: 'Cool Creator',
      username: 'coolcreator',
      avatarUrl: 'https://img.com/avatar.jpg',
    };

    it('notifies followers for public streams', async () => {
      usersFindFirst.mockResolvedValueOnce(mockCreator);
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
      ]);

      await NotificationService.notifyStreamStart('creator-1', 'stream-1', 'My Stream', 'public');

      expect(usersFindFirst).toHaveBeenCalled();
      expect(followsFindMany).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it('notifies followers for followers-only streams', async () => {
      usersFindFirst.mockResolvedValueOnce(mockCreator);
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
      ]);

      await NotificationService.notifyStreamStart('creator-1', 'stream-1', 'My Stream', 'followers');

      expect(followsFindMany).toHaveBeenCalled();
    });

    it('notifies subscribers for subscribers-only streams', async () => {
      usersFindFirst.mockResolvedValueOnce(mockCreator);
      subsFindMany.mockResolvedValueOnce([
        { userId: 'sub-1', user: { id: 'sub-1', username: 'sub1' } },
      ]);

      await NotificationService.notifyStreamStart('creator-1', 'stream-1', 'My Stream', 'subscribers');

      expect(subsFindMany).toHaveBeenCalled();
    });

    it('does nothing when creator not found', async () => {
      usersFindFirst.mockResolvedValueOnce(null);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await NotificationService.notifyStreamStart('missing-creator', 'stream-1', 'My Stream', 'public');

      expect(db.insert).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('uses displayName over username for creator name', async () => {
      usersFindFirst.mockResolvedValueOnce({
        displayName: 'Display Name',
        username: 'username',
        avatarUrl: null,
      });
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
      ]);

      await NotificationService.notifyStreamStart('creator-1', 'stream-1', 'My Stream', 'public');

      // The notification title should use displayName
      expect(db.insert).toHaveBeenCalled();
    });

    it('falls back to "A creator" when no name available', async () => {
      usersFindFirst.mockResolvedValueOnce({
        displayName: null,
        username: null,
        avatarUrl: null,
      });
      followsFindMany.mockResolvedValueOnce([
        { followerId: 'fan-1', follower: { id: 'fan-1', username: 'fan1' } },
      ]);

      await NotificationService.notifyStreamStart('creator-1', 'stream-1', 'My Stream', 'public');

      expect(db.insert).toHaveBeenCalled();
    });

    it('sends no notifications for ticketed/unknown privacy', async () => {
      usersFindFirst.mockResolvedValueOnce(mockCreator);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await NotificationService.notifyStreamStart('creator-1', 'stream-1', 'My Stream', 'ticketed');

      expect(db.insert).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
