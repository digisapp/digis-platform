/**
 * StreamService Test Suite
 *
 * Tests: getActiveStream, createStream, endStream, joinStream, leaveStream,
 * updateViewerCount, sendMessage, sendGift, sendTip, checkStreamAccess,
 * getViewerCount, cleanupStaleStreams, getLiveStreams, getStream,
 * getCreatorStreams, getAllGifts, getGiftLeaderboard, getCurrentViewers.
 *
 * Key behaviors: idempotent stream creation/ending, privacy-based access control,
 * commission splits for featured creators, goal progress, stale cleanup,
 * viewer count caching, blocked user enforcement.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));

vi.mock('@/lib/data/system', () => ({
  db: {
    query: {
      streams: { findFirst: vi.fn(), findMany: vi.fn() },
      streamViewers: { findFirst: vi.fn(), findMany: vi.fn() },
      streamMessages: { findMany: vi.fn() },
      virtualGifts: { findFirst: vi.fn(), findMany: vi.fn() },
      streamGoals: { findMany: vi.fn() },
      follows: { findFirst: vi.fn() },
      subscriptions: { findFirst: vi.fn() },
      streamTickets: { findFirst: vi.fn() },
      shows: { findMany: vi.fn() },
      showTickets: { findMany: vi.fn() },
      users: { findFirst: vi.fn() },
      wallets: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'new-id' }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 'updated-id' }])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 5 }])),
      })),
    })),
  },
  streams: {
    id: 'id', creatorId: 'creator_id', status: 'status',
    totalViews: 'total_views', currentViewers: 'current_viewers',
    peakViewers: 'peak_viewers', totalGiftsReceived: 'total_gifts_received',
    lastHeartbeat: 'last_heartbeat', updatedAt: 'updated_at',
    createdAt: 'created_at', startedAt: 'started_at',
    egressId: 'egress_id', featuredCreatorCommission: 'featured_creator_commission',
  },
  streamMessages: {
    streamId: 'stream_id', createdAt: 'created_at',
  },
  streamGifts: {
    streamId: 'stream_id', senderId: 'sender_id',
    senderUsername: 'sender_username', totalCoins: 'total_coins',
  },
  streamViewers: {
    id: 'id', streamId: 'stream_id', userId: 'user_id',
    lastSeenAt: 'last_seen_at', joinedAt: 'joined_at',
  },
  streamFeaturedCreators: {
    streamId: 'stream_id', creatorId: 'creator_id',
    tipsReceived: 'tips_received', giftCount: 'gift_count',
  },
  streamTickets: {
    streamId: 'stream_id', userId: 'user_id', isValid: 'is_valid', id: 'id',
  },
  streamGoals: {
    id: 'id', streamId: 'stream_id', isActive: 'is_active',
    isCompleted: 'is_completed', currentAmount: 'current_amount',
  },
  virtualGifts: { id: 'id', coinCost: 'coin_cost' },
  users: { id: 'id' },
  wallets: { userId: 'user_id' },
  follows: { followerId: 'follower_id', followingId: 'following_id' },
  subscriptions: {
    userId: 'user_id', creatorId: 'creator_id',
    status: 'status', expiresAt: 'expires_at',
  },
  shows: { streamId: 'stream_id', status: 'status' },
  showTickets: { showId: 'show_id', id: 'id' },
  walletTransactions: {},
}));

vi.mock('../wallet/wallet-service', () => ({
  WalletService: { createTransaction: vi.fn(() => Promise.resolve()) },
}));
vi.mock('@/lib/wallet/wallet-service', () => ({
  WalletService: { createTransaction: vi.fn(() => Promise.resolve()) },
}));

vi.mock('@/lib/cache', () => ({
  getCachedViewerCount: vi.fn(() => Promise.resolve(null)),
  setCachedViewerCount: vi.fn(() => Promise.resolve()),
  incrementViewerCount: vi.fn(() => Promise.resolve(1)),
  decrementViewerCount: vi.fn(() => Promise.resolve(0)),
}));

vi.mock('@/lib/services/livekit-egress-service', () => ({
  LiveKitEgressService: {
    startRecording: vi.fn(() => Promise.resolve('egress-1')),
    stopRecording: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/services/block-service', () => ({
  BlockService: {
    isBlockedByCreator: vi.fn(() => Promise.resolve(false)),
  },
}));

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    sendNotification: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/streams/ably-realtime-service', () => ({
  AblyRealtimeService: {
    broadcastStreamStarted: vi.fn(() => Promise.resolve()),
    broadcastStreamEndedGlobal: vi.fn(() => Promise.resolve()),
  },
}));

import { db } from '@/lib/data/system';
import { StreamService } from '@/lib/streams/stream-service';
import { WalletService } from '@/lib/wallet/wallet-service';
import { BlockService } from '@/lib/services/block-service';
import { getCachedViewerCount, setCachedViewerCount } from '@/lib/cache';
import { LiveKitEgressService } from '@/lib/services/livekit-egress-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const streamsFindFirst = db.query.streams.findFirst as ReturnType<typeof vi.fn>;
const streamsFindMany = db.query.streams.findMany as ReturnType<typeof vi.fn>;
const viewersFindFirst = db.query.streamViewers.findFirst as ReturnType<typeof vi.fn>;
const viewersFindMany = db.query.streamViewers.findMany as ReturnType<typeof vi.fn>;
const giftsFindFirst = db.query.virtualGifts.findFirst as ReturnType<typeof vi.fn>;
const goalsFindMany = db.query.streamGoals.findMany as ReturnType<typeof vi.fn>;
const followsFindFirst = db.query.follows.findFirst as ReturnType<typeof vi.fn>;
const subsFindFirst = db.query.subscriptions.findFirst as ReturnType<typeof vi.fn>;
const ticketsFindFirst = db.query.streamTickets.findFirst as ReturnType<typeof vi.fn>;
const usersFindFirst = db.query.users.findFirst as ReturnType<typeof vi.fn>;
const walletsFindFirst = db.query.wallets.findFirst as ReturnType<typeof vi.fn>;

function resetDbMocks() {
  // Reset insert chain
  (db.insert as any).mockReturnValue({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([{ id: 'new-id' }])),
    })),
  });
  // Reset update chain
  (db.update as any).mockReturnValue({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'updated-id', peakViewers: 10 }])),
      })),
    })),
  });
  // Reset delete chain
  (db.delete as any).mockReturnValue({
    where: vi.fn(() => Promise.resolve()),
  });
  // Reset select chain
  (db.select as any).mockReturnValue({
    from: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ count: 5 }])),
    })),
  });
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  resetDbMocks();
  goalsFindMany.mockResolvedValue([]);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StreamService', () => {
  describe('getActiveStream', () => {
    it('returns active stream for creator', async () => {
      const mockStream = { id: 'stream-1', creatorId: 'creator-1', status: 'live' };
      streamsFindFirst.mockResolvedValueOnce(mockStream);

      const result = await StreamService.getActiveStream('creator-1');
      expect(result).toEqual(mockStream);
    });

    it('returns undefined when no active stream', async () => {
      streamsFindFirst.mockResolvedValueOnce(undefined);

      const result = await StreamService.getActiveStream('creator-1');
      expect(result).toBeUndefined();
    });
  });

  describe('createStream', () => {
    it('returns existing stream if creator already has one active', async () => {
      const existingStream = { id: 'existing-1', creatorId: 'creator-1', status: 'live' };
      streamsFindFirst.mockResolvedValueOnce(existingStream);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await StreamService.createStream('creator-1', 'My Stream');

      expect(result).toEqual(existingStream);
      expect(db.insert).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('creates a new live stream with recording and Ably broadcast', async () => {
      // No existing stream
      streamsFindFirst.mockResolvedValueOnce(undefined);

      // Mock insert returning the new stream
      const newStream = { id: 'stream-new', creatorId: 'creator-1', status: 'live', roomName: 'stream_mock-uuid-1234' };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([newStream])),
        })),
      });

      // Mock creator lookup for Ably broadcast
      usersFindFirst.mockResolvedValueOnce({
        username: 'creator1',
        displayName: 'Creator One',
        avatarUrl: 'https://img.com/avatar.jpg',
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await StreamService.createStream('creator-1', 'My Stream', 'desc', 'public');

      expect(result.id).toBe('stream-new');
      expect(db.insert).toHaveBeenCalled();
      expect(LiveKitEgressService.startRecording).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled(); // egressId update
      consoleSpy.mockRestore();
    });

    it('creates a scheduled stream without starting recording', async () => {
      streamsFindFirst.mockResolvedValueOnce(undefined);

      const futureDate = new Date(Date.now() + 86400000); // tomorrow
      const newStream = { id: 'stream-sched', status: 'scheduled' };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([newStream])),
        })),
      });

      const result = await StreamService.createStream('creator-1', 'Scheduled Stream', undefined, 'public', undefined, futureDate);

      expect(result.status).toBe('scheduled');
      expect(LiveKitEgressService.startRecording).not.toHaveBeenCalled();
    });
  });

  describe('endStream', () => {
    it('throws when stream not found', async () => {
      streamsFindFirst.mockResolvedValueOnce(null);

      await expect(StreamService.endStream('missing-id')).rejects.toThrow('Stream not found');
    });

    it('returns stream unchanged if already ended (idempotent)', async () => {
      const endedStream = { id: 'stream-1', status: 'ended', creatorId: 'creator-1' };
      streamsFindFirst.mockResolvedValueOnce(endedStream);

      const result = await StreamService.endStream('stream-1');
      expect(result).toEqual(endedStream);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('ends a live stream and clears viewers', async () => {
      const liveStream = {
        id: 'stream-1', status: 'live', creatorId: 'creator-1',
        startedAt: new Date(Date.now() - 3600000), egressId: 'egress-1',
      };
      streamsFindFirst.mockResolvedValueOnce(liveStream);

      // Mock shows query for cancelScheduledShowsForStream
      (db.query.shows.findMany as any).mockResolvedValueOnce([]);

      const updatedStream = { ...liveStream, status: 'ended' };
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([updatedStream])),
          })),
        })),
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await StreamService.endStream('stream-1');

      expect(result.status).toBe('ended');
      expect(LiveKitEgressService.stopRecording).toHaveBeenCalledWith('egress-1');
      expect(db.delete).toHaveBeenCalled(); // clear viewers
      expect(AblyRealtimeService.broadcastStreamEndedGlobal).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('joinStream', () => {
    it('throws when stream not found', async () => {
      streamsFindFirst.mockResolvedValueOnce(null);

      await expect(StreamService.joinStream('missing', 'user-1', 'user1')).rejects.toThrow('Stream not found');
    });

    it('throws when stream is not live', async () => {
      streamsFindFirst.mockResolvedValueOnce({ id: 'stream-1', status: 'ended' });

      await expect(StreamService.joinStream('stream-1', 'user-1', 'user1')).rejects.toThrow('Stream is not live');
    });

    it('updates lastSeenAt for existing viewer', async () => {
      streamsFindFirst.mockResolvedValueOnce({ id: 'stream-1', status: 'live' });
      viewersFindFirst.mockResolvedValueOnce({ id: 'viewer-1', userId: 'user-1' });

      const result = await StreamService.joinStream('stream-1', 'user-1', 'user1');

      expect(result).toEqual({ id: 'viewer-1', userId: 'user-1' });
      expect(db.update).toHaveBeenCalled(); // lastSeenAt update
    });

    it('adds new viewer and increments total views', async () => {
      streamsFindFirst.mockResolvedValueOnce({ id: 'stream-1', status: 'live' });
      viewersFindFirst.mockResolvedValueOnce(null);

      const newViewer = { id: 'viewer-new', userId: 'user-1', username: 'user1' };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([newViewer])),
        })),
      });

      const result = await StreamService.joinStream('stream-1', 'user-1', 'user1');

      expect(result).toEqual(newViewer);
      expect(db.insert).toHaveBeenCalled();
      // Should call updateViewerCount and increment totalViews
      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('inserts and returns a chat message', async () => {
      const mockMsg = { id: 'msg-1', streamId: 'stream-1', message: 'Hello!' };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mockMsg])),
        })),
      });

      const result = await StreamService.sendMessage('stream-1', 'user-1', 'user1', 'Hello!');
      expect(result).toEqual(mockMsg);
    });
  });

  describe('sendGift', () => {
    it('throws when gift not found', async () => {
      giftsFindFirst.mockResolvedValueOnce(null);

      await expect(
        StreamService.sendGift('stream-1', 'sender-1', 'sender1', 'missing-gift')
      ).rejects.toThrow('Gift not found');
    });

    it('deducts coins from sender and credits stream creator', async () => {
      const gift = { id: 'gift-1', coinCost: 50, emoji: '💎', name: 'Diamond' };
      giftsFindFirst.mockResolvedValueOnce(gift);

      // Mock for streamGift insert
      const streamGift = { id: 'sg-1' };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([streamGift])),
        })),
      });

      // Stream lookup for crediting creator
      streamsFindFirst.mockResolvedValueOnce({ id: 'stream-1', creatorId: 'creator-1' });

      const result = await StreamService.sendGift('stream-1', 'sender-1', 'sender1', 'gift-1', 2);

      // Deduct: 50 * 2 = 100 coins
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'sender-1', amount: -100 })
      );

      // Credit creator
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'creator-1', amount: 100 })
      );

      expect(result.streamGift).toEqual(streamGift);
      expect(result.gift).toEqual(gift);
    });

    it('credits featured creator directly when recipientCreatorId provided', async () => {
      const gift = { id: 'gift-1', coinCost: 100, emoji: '🌟', name: 'Star' };
      giftsFindFirst.mockResolvedValueOnce(gift);

      const streamGift = { id: 'sg-1' };
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([streamGift])),
        })),
      });

      const result = await StreamService.sendGift(
        'stream-1', 'sender-1', 'sender1', 'gift-1', 1,
        'featured-creator', 'featureduser'
      );

      // Should credit featured creator, not stream creator
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'featured-creator', amount: 100 })
      );
      expect(result.recipientCreatorId).toBe('featured-creator');
    });
  });

  describe('sendTip', () => {
    it('rejects tips below 1 coin', async () => {
      await expect(
        StreamService.sendTip('stream-1', 'sender-1', 'sender1', 0)
      ).rejects.toThrow('Minimum tip is 1 coin');
    });

    it('deducts from sender and credits stream creator', async () => {
      // Stream lookup for creator credit
      streamsFindFirst.mockResolvedValueOnce({ id: 'stream-1', creatorId: 'creator-1' });
      walletsFindFirst.mockResolvedValueOnce({ balance: 400 });

      const result = await StreamService.sendTip('stream-1', 'sender-1', 'sender1', 50);

      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'sender-1', amount: -50 })
      );
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'creator-1', amount: 50 })
      );
      expect(result.newBalance).toBe(400);
    });

    it('splits tip between featured creator and host based on commission', async () => {
      // First call: stream lookup for commission
      streamsFindFirst.mockResolvedValueOnce({
        id: 'stream-1', creatorId: 'host-1', featuredCreatorCommission: 20,
      });
      walletsFindFirst.mockResolvedValueOnce({ balance: 200 });

      await StreamService.sendTip(
        'stream-1', 'sender-1', 'sender1', 100,
        'featured-1', 'featureduser'
      );

      // 20% commission to host = 20, 80% to featured = 80
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'featured-1', amount: 80 })
      );
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'host-1', amount: 20 })
      );
    });

    it('gives 100% to featured creator when commission is 0', async () => {
      streamsFindFirst.mockResolvedValueOnce({
        id: 'stream-1', creatorId: 'host-1', featuredCreatorCommission: 0,
      });
      walletsFindFirst.mockResolvedValueOnce({ balance: 100 });

      await StreamService.sendTip(
        'stream-1', 'sender-1', 'sender1', 50,
        'featured-1', 'featureduser'
      );

      // 0% commission = host gets 0, featured gets 50
      expect(WalletService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'featured-1', amount: 50 })
      );
      // Host should NOT get a transaction since hostAmount = 0
      expect(WalletService.createTransaction).not.toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'host-1' })
      );
    });
  });

  describe('checkStreamAccess', () => {
    const baseStream = { id: 'stream-1', creatorId: 'creator-1', creator: { id: 'creator-1' } };

    it('denies access when stream not found', async () => {
      streamsFindFirst.mockResolvedValueOnce(null);

      const result = await StreamService.checkStreamAccess('missing', 'user-1');
      expect(result).toEqual({ hasAccess: false, reason: 'Stream not found' });
    });

    it('grants access to stream creator', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'subscribers' });

      const result = await StreamService.checkStreamAccess('stream-1', 'creator-1');
      expect(result).toEqual({ hasAccess: true });
    });

    it('denies access to blocked users', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'public' });
      (BlockService.isBlockedByCreator as any).mockResolvedValueOnce(true);

      const result = await StreamService.checkStreamAccess('stream-1', 'blocked-user');
      expect(result.hasAccess).toBe(false);
    });

    it('grants access to public streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'public' });

      const result = await StreamService.checkStreamAccess('stream-1', 'user-1');
      expect(result).toEqual({ hasAccess: true });
    });

    it('denies unauthenticated users from followers-only streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'followers' });

      const result = await StreamService.checkStreamAccess('stream-1', null);
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('followers only');
    });

    it('grants access to followers of followers-only streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'followers' });
      followsFindFirst.mockResolvedValueOnce({ id: 'follow-1' });

      const result = await StreamService.checkStreamAccess('stream-1', 'follower-1');
      expect(result).toEqual({ hasAccess: true });
    });

    it('denies non-followers from followers-only streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'followers' });
      followsFindFirst.mockResolvedValueOnce(null);

      const result = await StreamService.checkStreamAccess('stream-1', 'stranger');
      expect(result.hasAccess).toBe(false);
    });

    it('grants access to active subscribers of subscribers-only streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'subscribers' });
      subsFindFirst.mockResolvedValueOnce({ id: 'sub-1', status: 'active' });

      const result = await StreamService.checkStreamAccess('stream-1', 'subscriber-1');
      expect(result).toEqual({ hasAccess: true });
    });

    it('denies non-subscribers from subscribers-only streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'subscribers' });
      subsFindFirst.mockResolvedValueOnce(null);

      const result = await StreamService.checkStreamAccess('stream-1', 'non-sub');
      expect(result.hasAccess).toBe(false);
    });

    it('grants access to ticket holders for ticketed streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'ticketed' });
      ticketsFindFirst.mockResolvedValueOnce({ id: 'ticket-1', isValid: true });

      const result = await StreamService.checkStreamAccess('stream-1', 'ticket-holder');
      expect(result).toEqual({ hasAccess: true });
    });

    it('denies users without tickets from ticketed streams', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'ticketed' });
      ticketsFindFirst.mockResolvedValueOnce(null);

      const result = await StreamService.checkStreamAccess('stream-1', 'no-ticket');
      expect(result.hasAccess).toBe(false);
      expect(result.reason).toContain('purchase a ticket');
    });

    it('denies access for unknown privacy settings', async () => {
      streamsFindFirst.mockResolvedValueOnce({ ...baseStream, privacy: 'custom' });

      const result = await StreamService.checkStreamAccess('stream-1', 'user-1');
      expect(result.hasAccess).toBe(false);
    });
  });

  describe('getViewerCount', () => {
    it('returns cached count when available', async () => {
      (getCachedViewerCount as any).mockResolvedValueOnce(42);

      const result = await StreamService.getViewerCount('stream-1');
      expect(result).toBe(42);
      expect(streamsFindFirst).not.toHaveBeenCalled();
    });

    it('falls back to database on cache miss', async () => {
      (getCachedViewerCount as any).mockResolvedValueOnce(null);
      streamsFindFirst.mockResolvedValueOnce({ currentViewers: 15 });

      const result = await StreamService.getViewerCount('stream-1');
      expect(result).toBe(15);
      expect(setCachedViewerCount).toHaveBeenCalledWith('stream-1', 15);
    });

    it('returns 0 when stream not found', async () => {
      (getCachedViewerCount as any).mockResolvedValueOnce(null);
      streamsFindFirst.mockResolvedValueOnce(null);

      const result = await StreamService.getViewerCount('missing');
      expect(result).toBe(0);
    });
  });

  describe('cleanupStaleStreams', () => {
    it('marks stale live streams as ended', async () => {
      const staleStreams = [{ id: 'stale-1' }, { id: 'stale-2' }];
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve(staleStreams)),
          })),
        })),
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await StreamService.cleanupStaleStreams();

      expect(db.update).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not throw on database error', async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.reject(new Error('DB error'))),
          })),
        })),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(StreamService.cleanupStaleStreams()).resolves.not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('getLiveStreams', () => {
    it('filters out suspended and hidden creators', async () => {
      // cleanupStaleStreams mock
      (db.update as any).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([])),
          })),
        })),
      });

      streamsFindMany.mockResolvedValueOnce([
        { id: 's-1', creator: { accountStatus: 'active', isHiddenFromDiscovery: false } },
        { id: 's-2', creator: { accountStatus: 'suspended', isHiddenFromDiscovery: false } },
        { id: 's-3', creator: { accountStatus: 'active', isHiddenFromDiscovery: true } },
        { id: 's-4', creator: { accountStatus: null, isHiddenFromDiscovery: false } },
      ]);

      const result = await StreamService.getLiveStreams();

      // Only s-1 (active, not hidden) and s-4 (null status = active, not hidden) should pass
      expect(result).toHaveLength(2);
      expect(result.map((s: any) => s.id)).toEqual(['s-1', 's-4']);
    });
  });

  describe('getGiftLeaderboard', () => {
    it('returns leaderboard with numeric totalCoins', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            groupBy: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([
                  { username: 'bigspender', senderId: 'u-1', totalCoins: '500' },
                  { username: 'midspender', senderId: 'u-2', totalCoins: 200 },
                ])),
              })),
            })),
          })),
        })),
      });

      const result = await StreamService.getGiftLeaderboard('stream-1');

      expect(result).toHaveLength(2);
      // String should be converted to number
      expect(result[0].totalCoins).toBe(500);
      expect(typeof result[0].totalCoins).toBe('number');
    });
  });

  describe('getStream / getCreatorStreams / getAllGifts', () => {
    it('getStream returns stream with creator details', async () => {
      const mockStream = { id: 'stream-1', creator: { id: 'c-1', username: 'creator1' } };
      streamsFindFirst.mockResolvedValueOnce(mockStream);

      const result = await StreamService.getStream('stream-1');
      expect(result).toEqual(mockStream);
    });

    it('getCreatorStreams returns creator streams', async () => {
      streamsFindMany.mockResolvedValueOnce([{ id: 's-1' }, { id: 's-2' }]);

      const result = await StreamService.getCreatorStreams('creator-1');
      expect(result).toHaveLength(2);
    });

    it('getAllGifts returns all virtual gifts', async () => {
      const mockGifts = [{ id: 'g-1', name: 'Star' }, { id: 'g-2', name: 'Diamond' }];
      (db.query.virtualGifts.findMany as any).mockResolvedValueOnce(mockGifts);

      const result = await StreamService.getAllGifts();
      expect(result).toEqual(mockGifts);
    });
  });
});
