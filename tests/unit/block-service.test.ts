/**
 * BlockService Test Suite
 *
 * Tests all 8 public methods: blockUser, unblockUser, isBlocked,
 * isEitherBlocked, isBlockedByCreator, getBlockedUsers, getBlockStatus,
 * getBlockedByCount.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/data/system', () => {
  const mockInsertValues = vi.fn(() => Promise.resolve());
  const mockDeleteWhere = vi.fn(() => Promise.resolve());

  return {
    db: {
      query: {
        userBlocks: { findFirst: vi.fn(), findMany: vi.fn() },
        users: { findMany: vi.fn() },
      },
      insert: vi.fn(() => ({
        values: mockInsertValues,
      })),
      delete: vi.fn(() => ({
        where: mockDeleteWhere,
      })),
    },
    userBlocks: {
      blockerId: 'blocker_id',
      blockedId: 'blocked_id',
      createdAt: 'created_at',
    },
    users: { id: 'id' },
  };
});

import { db } from '@/lib/data/system';
import { BlockService } from '@/lib/services/block-service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const findFirst = db.query.userBlocks.findFirst as ReturnType<typeof vi.fn>;
const findMany = db.query.userBlocks.findMany as ReturnType<typeof vi.fn>;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BlockService', () => {
  describe('blockUser', () => {
    it('blocks a user successfully', async () => {
      findFirst.mockResolvedValue(null);

      const result = await BlockService.blockUser('user-1', 'user-2', 'spam');
      expect(result).toEqual({ success: true });
      expect(db.insert).toHaveBeenCalled();
    });

    it('prevents self-blocking', async () => {
      const result = await BlockService.blockUser('user-1', 'user-1');
      expect(result).toEqual({ success: false, error: 'Cannot block yourself' });
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('returns success if already blocked (idempotent)', async () => {
      findFirst.mockResolvedValue({ id: 'block-1', blockerId: 'user-1', blockedId: 'user-2' });

      const result = await BlockService.blockUser('user-1', 'user-2');
      expect(result).toEqual({ success: true });
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('handles database errors gracefully', async () => {
      findFirst.mockResolvedValue(null);
      // Make insert throw
      (db.insert as any).mockReturnValue({
        values: vi.fn(() => Promise.reject(new Error('DB connection lost'))),
      });

      const result = await BlockService.blockUser('user-1', 'user-2');
      expect(result).toEqual({ success: false, error: 'Failed to block user' });
    });
  });

  describe('unblockUser', () => {
    it('unblocks a user successfully', async () => {
      const result = await BlockService.unblockUser('user-1', 'user-2');
      expect(result).toEqual({ success: true });
    });

    it('handles database errors gracefully', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn(() => Promise.reject(new Error('DB error'))),
      });

      const result = await BlockService.unblockUser('user-1', 'user-2');
      expect(result).toEqual({ success: false, error: 'Failed to unblock user' });
    });
  });

  describe('isBlocked', () => {
    it('returns true when user is blocked', async () => {
      findFirst.mockResolvedValue({ id: 'block-1' });

      const result = await BlockService.isBlocked('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when user is not blocked', async () => {
      findFirst.mockResolvedValue(null);

      const result = await BlockService.isBlocked('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });

  describe('isEitherBlocked', () => {
    it('returns true when first user blocked second', async () => {
      findFirst.mockResolvedValue({ blockerId: 'user-1', blockedId: 'user-2' });

      const result = await BlockService.isEitherBlocked('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns true when second user blocked first', async () => {
      findFirst.mockResolvedValue({ blockerId: 'user-2', blockedId: 'user-1' });

      const result = await BlockService.isEitherBlocked('user-1', 'user-2');
      expect(result).toBe(true);
    });

    it('returns false when neither user blocked the other', async () => {
      findFirst.mockResolvedValue(null);

      const result = await BlockService.isEitherBlocked('user-1', 'user-2');
      expect(result).toBe(false);
    });
  });

  describe('isBlockedByCreator', () => {
    it('delegates to isBlocked with creator as blocker', async () => {
      findFirst.mockResolvedValue({ id: 'block-1' });

      const result = await BlockService.isBlockedByCreator('creator-1', 'viewer-1');
      expect(result).toBe(true);
    });
  });

  describe('getBlockedUsers', () => {
    it('returns blocked users with details', async () => {
      const blocks = [
        { id: 'block-1', blockedId: 'user-2', reason: 'spam', createdAt: new Date('2025-01-01') },
        { id: 'block-2', blockedId: 'user-3', reason: null, createdAt: new Date('2025-01-02') },
      ];
      findMany.mockResolvedValueOnce(blocks);

      (db.query.users.findMany as any).mockResolvedValueOnce([
        { id: 'user-2', username: 'spammer', displayName: 'Spammer', avatarUrl: 'https://example.com/avatar.jpg' },
        { id: 'user-3', username: 'troll', displayName: null, avatarUrl: null },
      ]);

      const result = await BlockService.getBlockedUsers('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'block-1',
        blockedId: 'user-2',
        username: 'spammer',
        displayName: 'Spammer',
        avatarUrl: 'https://example.com/avatar.jpg',
        reason: 'spam',
        createdAt: new Date('2025-01-01'),
      });
      expect(result[1].username).toBe('troll');
      expect(result[1].displayName).toBeNull();
    });

    it('returns empty array when no blocks', async () => {
      findMany.mockResolvedValueOnce([]);

      const result = await BlockService.getBlockedUsers('user-1');
      expect(result).toEqual([]);
    });

    it('handles missing user data gracefully', async () => {
      findMany.mockResolvedValueOnce([
        { id: 'block-1', blockedId: 'deleted-user', reason: null, createdAt: new Date() },
      ]);
      (db.query.users.findMany as any).mockResolvedValueOnce([]);

      const result = await BlockService.getBlockedUsers('user-1');
      expect(result[0].username).toBeNull();
      expect(result[0].displayName).toBeNull();
      expect(result[0].avatarUrl).toBeNull();
    });
  });

  describe('getBlockStatus', () => {
    it('returns both directions when mutual block', async () => {
      findMany.mockResolvedValueOnce([
        { blockerId: 'user-1', blockedId: 'user-2' },
        { blockerId: 'user-2', blockedId: 'user-1' },
      ]);

      const result = await BlockService.getBlockStatus('user-1', 'user-2');
      expect(result).toEqual({ blockedByMe: true, blockedByThem: true });
    });

    it('returns one-way block correctly', async () => {
      findMany.mockResolvedValueOnce([
        { blockerId: 'user-1', blockedId: 'user-2' },
      ]);

      const result = await BlockService.getBlockStatus('user-1', 'user-2');
      expect(result).toEqual({ blockedByMe: true, blockedByThem: false });
    });

    it('returns no blocks', async () => {
      findMany.mockResolvedValueOnce([]);

      const result = await BlockService.getBlockStatus('user-1', 'user-2');
      expect(result).toEqual({ blockedByMe: false, blockedByThem: false });
    });
  });

  describe('getBlockedByCount', () => {
    it('returns count of users who blocked this user', async () => {
      findMany.mockResolvedValueOnce([{ id: '1' }, { id: '2' }, { id: '3' }]);

      const result = await BlockService.getBlockedByCount('user-1');
      expect(result).toBe(3);
    });

    it('returns 0 when nobody blocked this user', async () => {
      findMany.mockResolvedValueOnce([]);

      const result = await BlockService.getBlockedByCount('user-1');
      expect(result).toBe(0);
    });
  });
});
