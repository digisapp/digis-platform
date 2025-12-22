import { db } from '@/lib/data/system';
import { userActivityLogs } from '@/db/schema/admin';
import { desc, eq, and, sql, gte, lte } from 'drizzle-orm';

/**
 * Admin Audit Logging Service
 *
 * Logs all administrative actions for compliance and security.
 * All admin actions should be logged through this service.
 *
 * Activity Types:
 * - user_ban: Admin banned a user
 * - user_unban: Admin unbanned a user
 * - creator_verify: Admin verified a creator
 * - creator_reject: Admin rejected creator application
 * - content_remove: Admin removed content
 * - payout_approve: Admin approved a payout
 * - payout_reject: Admin rejected a payout
 * - settings_change: Admin changed platform settings
 * - role_change: Admin changed user role
 * - refund_issue: Admin issued a refund
 * - gift_modify: Admin modified gift catalog
 */

export type AdminActionType =
  | 'user_ban'
  | 'user_unban'
  | 'creator_verify'
  | 'creator_reject'
  | 'content_remove'
  | 'payout_approve'
  | 'payout_reject'
  | 'settings_change'
  | 'role_change'
  | 'refund_issue'
  | 'gift_modify'
  | 'stream_terminate'
  | 'account_suspend'
  | 'account_reinstate'
  | 'data_export'
  | 'user_impersonate';

export interface AdminAuditMetadata {
  targetUserId?: string;
  targetUsername?: string;
  reason?: string;
  previousValue?: unknown;
  newValue?: unknown;
  amount?: number;
  contentId?: string;
  streamId?: string;
  applicationId?: string;
  [key: string]: unknown;
}

export class AdminAuditService {
  /**
   * Log an administrative action
   */
  static async log(
    adminUserId: string,
    actionType: AdminActionType,
    metadata: AdminAuditMetadata,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await db.insert(userActivityLogs).values({
        userId: adminUserId,
        activityType: `admin:${actionType}`,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: JSON.stringify({
          ...metadata,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      // Log to console but don't throw - audit logging should not break admin operations
      console.error('[AdminAudit] Failed to log action:', error, {
        adminUserId,
        actionType,
        metadata,
      });
    }
  }

  /**
   * Get audit logs for a specific admin
   */
  static async getLogsByAdmin(
    adminUserId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return db.query.userActivityLogs.findMany({
      where: and(
        eq(userActivityLogs.userId, adminUserId),
        sql`${userActivityLogs.activityType} LIKE 'admin:%'`
      ),
      orderBy: [desc(userActivityLogs.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * Get audit logs for a specific target user
   */
  static async getLogsByTargetUser(
    targetUserId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return db.query.userActivityLogs.findMany({
      where: and(
        sql`${userActivityLogs.activityType} LIKE 'admin:%'`,
        sql`${userActivityLogs.metadata}::jsonb->>'targetUserId' = ${targetUserId}`
      ),
      orderBy: [desc(userActivityLogs.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * Get all audit logs (with filtering)
   */
  static async getAllLogs(options: {
    limit?: number;
    offset?: number;
    actionType?: AdminActionType;
    adminUserId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const {
      limit = 50,
      offset = 0,
      actionType,
      adminUserId,
      startDate,
      endDate,
    } = options;

    const conditions = [sql`${userActivityLogs.activityType} LIKE 'admin:%'`];

    if (actionType) {
      conditions.push(eq(userActivityLogs.activityType, `admin:${actionType}`));
    }

    if (adminUserId) {
      conditions.push(eq(userActivityLogs.userId, adminUserId));
    }

    if (startDate) {
      conditions.push(gte(userActivityLogs.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(userActivityLogs.createdAt, endDate));
    }

    return db.query.userActivityLogs.findMany({
      where: and(...conditions),
      orderBy: [desc(userActivityLogs.createdAt)],
      limit,
      offset,
    });
  }

  /**
   * Get audit log count by action type (for analytics)
   */
  static async getActionCounts(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const conditions = [sql`${userActivityLogs.activityType} LIKE 'admin:%'`];

    if (startDate) {
      conditions.push(gte(userActivityLogs.createdAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(userActivityLogs.createdAt, endDate));
    }

    const result = await db
      .select({
        activityType: userActivityLogs.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .where(and(...conditions))
      .groupBy(userActivityLogs.activityType);

    return result.reduce((acc, row) => {
      const type = row.activityType.replace('admin:', '');
      acc[type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Convenience methods for common admin actions

  static async logUserBan(
    adminUserId: string,
    targetUserId: string,
    targetUsername: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'user_ban',
      { targetUserId, targetUsername, reason },
      ipAddress,
      userAgent
    );
  }

  static async logUserUnban(
    adminUserId: string,
    targetUserId: string,
    targetUsername: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'user_unban',
      { targetUserId, targetUsername, reason },
      ipAddress,
      userAgent
    );
  }

  static async logCreatorVerify(
    adminUserId: string,
    targetUserId: string,
    targetUsername: string,
    applicationId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'creator_verify',
      { targetUserId, targetUsername, applicationId },
      ipAddress,
      userAgent
    );
  }

  static async logCreatorReject(
    adminUserId: string,
    targetUserId: string,
    targetUsername: string,
    applicationId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'creator_reject',
      { targetUserId, targetUsername, applicationId, reason },
      ipAddress,
      userAgent
    );
  }

  static async logContentRemove(
    adminUserId: string,
    contentId: string,
    targetUserId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'content_remove',
      { contentId, targetUserId, reason },
      ipAddress,
      userAgent
    );
  }

  static async logRoleChange(
    adminUserId: string,
    targetUserId: string,
    targetUsername: string,
    previousRole: string,
    newRole: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'role_change',
      { targetUserId, targetUsername, previousValue: previousRole, newValue: newRole, reason },
      ipAddress,
      userAgent
    );
  }

  static async logRefund(
    adminUserId: string,
    targetUserId: string,
    amount: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'refund_issue',
      { targetUserId, amount, reason },
      ipAddress,
      userAgent
    );
  }

  static async logStreamTerminate(
    adminUserId: string,
    streamId: string,
    targetUserId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log(
      adminUserId,
      'stream_terminate',
      { streamId, targetUserId, reason },
      ipAddress,
      userAgent
    );
  }
}
