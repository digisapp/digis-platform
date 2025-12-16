/**
 * Block Service - Unified user blocking system
 *
 * When a user is blocked, they cannot:
 * - Watch blocker's streams
 * - Chat in blocker's streams
 * - Send gifts/tips to blocker
 * - Send DMs to blocker
 * - Request Go Private with blocker
 * - Follow blocker
 */

import { db, userBlocks, users } from '@/lib/data/system';
import { eq, and, or } from 'drizzle-orm';

export class BlockService {
  /**
   * Block a user globally
   */
  static async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    // Can't block yourself
    if (blockerId === blockedId) {
      return { success: false, error: 'Cannot block yourself' };
    }

    try {
      // Check if already blocked
      const existingBlock = await db.query.userBlocks.findFirst({
        where: and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId)
        ),
      });

      if (existingBlock) {
        return { success: true }; // Already blocked
      }

      // Create the block
      await db.insert(userBlocks).values({
        blockerId,
        blockedId,
        reason: reason || null,
      });

      console.log(`[BlockService] User ${blockerId} blocked ${blockedId}`);
      return { success: true };
    } catch (error) {
      console.error('[BlockService] Error blocking user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.delete(userBlocks).where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId)
        )
      );

      console.log(`[BlockService] User ${blockerId} unblocked ${blockedId}`);
      return { success: true };
    } catch (error) {
      console.error('[BlockService] Error unblocking user:', error);
      return { success: false, error: 'Failed to unblock user' };
    }
  }

  /**
   * Check if userA has blocked userB
   */
  static async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await db.query.userBlocks.findFirst({
      where: and(
        eq(userBlocks.blockerId, blockerId),
        eq(userBlocks.blockedId, blockedId)
      ),
    });
    return !!block;
  }

  /**
   * Check if either user has blocked the other (bidirectional check)
   * Useful for DMs where either party blocking should prevent messages
   */
  static async isEitherBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await db.query.userBlocks.findFirst({
      where: or(
        and(eq(userBlocks.blockerId, userId1), eq(userBlocks.blockedId, userId2)),
        and(eq(userBlocks.blockerId, userId2), eq(userBlocks.blockedId, userId1))
      ),
    });
    return !!block;
  }

  /**
   * Check if a viewer is blocked by a creator (for stream access)
   */
  static async isBlockedByCreator(creatorId: string, viewerId: string): Promise<boolean> {
    return this.isBlocked(creatorId, viewerId);
  }

  /**
   * Get all users blocked by a user
   */
  static async getBlockedUsers(userId: string): Promise<Array<{
    id: string;
    blockedId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    reason: string | null;
    createdAt: Date;
  }>> {
    const blocks = await db.query.userBlocks.findMany({
      where: eq(userBlocks.blockerId, userId),
      orderBy: (userBlocks, { desc }) => [desc(userBlocks.createdAt)],
    });

    // Get user details for each blocked user
    const blockedUserIds = blocks.map(b => b.blockedId);
    if (blockedUserIds.length === 0) return [];

    const blockedUsers = await db.query.users.findMany({
      where: (users, { inArray }) => inArray(users.id, blockedUserIds),
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(blockedUsers.map(u => [u.id, u]));

    return blocks.map(block => {
      const user = userMap.get(block.blockedId);
      return {
        id: block.id,
        blockedId: block.blockedId,
        username: user?.username || null,
        displayName: user?.displayName || null,
        avatarUrl: user?.avatarUrl || null,
        reason: block.reason,
        createdAt: block.createdAt,
      };
    });
  }

  /**
   * Get block status between two users
   */
  static async getBlockStatus(userId1: string, userId2: string): Promise<{
    blockedByMe: boolean;
    blockedByThem: boolean;
  }> {
    const blocks = await db.query.userBlocks.findMany({
      where: or(
        and(eq(userBlocks.blockerId, userId1), eq(userBlocks.blockedId, userId2)),
        and(eq(userBlocks.blockerId, userId2), eq(userBlocks.blockedId, userId1))
      ),
    });

    return {
      blockedByMe: blocks.some(b => b.blockerId === userId1 && b.blockedId === userId2),
      blockedByThem: blocks.some(b => b.blockerId === userId2 && b.blockedId === userId1),
    };
  }

  /**
   * Count how many users have blocked this user (for admin/moderation)
   */
  static async getBlockedByCount(userId: string): Promise<number> {
    const blocks = await db.query.userBlocks.findMany({
      where: eq(userBlocks.blockedId, userId),
      columns: { id: true },
    });
    return blocks.length;
  }
}
