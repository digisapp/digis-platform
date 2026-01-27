import { db } from '@/lib/data/system';
import { users, creatorApplications, payoutRequests, creatorSettings, aiTwinSettings } from '@/lib/data/system';
import { eq, and, or, ilike, desc, count, sql, sum, gte } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withTimeoutAndRetry } from '@/lib/async-utils';
import { sendCreatorApprovalEmail, addCreatorToAudience } from '@/lib/email/creator-notifications';
import { NotificationService } from '@/lib/services/notification-service';

export class AdminService {
  /**
   * Check if user is admin
   *
   * SECURITY: Admin status is determined ONLY by the database isAdmin flag.
   * Hardcoded email lists have been removed to prevent security vulnerabilities.
   *
   * To make someone admin:
   * - Use the admin dashboard to set isAdmin = true
   * - Or run: UPDATE users SET is_admin = true WHERE email = 'user@example.com';
   */
  static async isAdmin(userId: string): Promise<boolean> {
    let user;
    try {
      user = await withTimeoutAndRetry(
        () => db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { role: true, email: true, isAdmin: true },
        }),
        { timeoutMs: 5000, retries: 1, tag: 'isAdmin' }
      );
    } catch (e) {
      console.error('[AdminService] DB query failed:', e);
      // If DB fails, we can't check - deny access for security
      return false;
    }

    if (!user) {
      console.log('[AdminService] User not found:', userId);
      return false;
    }

    // PRIMARY CHECK: isAdmin flag in DB (ONLY source of truth)
    if (user.isAdmin === true) {
      console.log('[AdminService] Admin access granted by isAdmin flag, userId:', userId);
      return true;
    }

    // LEGACY: Check if role is 'admin' (for backwards compatibility)
    if (user.role === 'admin') {
      console.log('[AdminService] Admin access granted by legacy role, userId:', userId);
      return true;
    }

    console.log('[AdminService] Admin access DENIED, userId:', userId, { isAdmin: user.isAdmin, role: user.role });
    return false;
  }

  // Get all pending creator applications
  static async getPendingApplications(limit = 50, offset = 0) {
    try {
      const applications = await withTimeoutAndRetry(
        () => db.query.creatorApplications.findMany({
          where: eq(creatorApplications.status, 'pending'),
          orderBy: desc(creatorApplications.createdAt),
          limit,
          offset,
          with: {
            user: {
              columns: {
                id: true,
                email: true,
                username: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
        }),
        { timeoutMs: 3000, retries: 1, tag: 'pendingApps' }
      );

      return applications;
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      return [];
    }
  }

  // Get all applications (with filters)
  static async getAllApplications(
    status?: 'pending' | 'approved' | 'rejected',
    limit = 50,
    offset = 0
  ) {
    try {
      const applications = await withTimeoutAndRetry(
        () => db.query.creatorApplications.findMany({
          where: status ? eq(creatorApplications.status, status) : undefined,
          orderBy: desc(creatorApplications.createdAt),
          limit,
          offset,
          with: {
            user: {
              columns: {
                id: true,
                email: true,
                username: true,
                avatarUrl: true,
                createdAt: true,
              },
            },
          },
        }),
        { timeoutMs: 3000, retries: 1, tag: 'allApps' }
      );

      return applications;
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  }

  // Approve creator application
  static async approveApplication(applicationId: string, adminId: string) {
    // Get the application with user data
    const application = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.id, applicationId),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application already reviewed');
    }

    // Update application status
    await db.update(creatorApplications)
      .set({
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creatorApplications.id, applicationId));

    // Update user to creator role in database
    await db.update(users)
      .set({
        role: 'creator',
        isCreatorVerified: true,
        displayName: application.displayName,
        bio: application.bio,
        updatedAt: new Date(),
      })
      .where(eq(users.id, application.userId));

    // Create default creator settings
    await db.insert(creatorSettings)
      .values({
        userId: application.userId,
        messageRate: 3, // 3 coins = $0.30 per message (minimum)
        callRatePerMinute: 25, // 25 coins/min = $2.50/min
        minimumCallDuration: 5,
        isAvailableForCalls: false,
        voiceCallRatePerMinute: 15, // 15 coins/min = $1.50/min
        minimumVoiceCallDuration: 5,
        isAvailableForVoiceCalls: false,
      })
      .onConflictDoNothing();

    // Create default AI Twin settings
    await db.insert(aiTwinSettings)
      .values({
        creatorId: application.userId,
        enabled: false,
        textChatEnabled: false,
        voice: 'ara',
        pricePerMinute: 20,
        minimumMinutes: 5,
        maxSessionMinutes: 60,
        textPricePerMessage: 5,
      })
      .onConflictDoNothing();

    // 🔥 CRITICAL: Update Supabase auth app_metadata to put role in JWT
    // This prevents role from switching back to fan during DB issues
    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        application.userId,
        {
          app_metadata: { role: 'creator' },
          user_metadata: {
            is_creator_verified: true,
            display_name: application.displayName
          }
        }
      );

      if (updateError) {
        console.error('Failed to update auth metadata for creator:', updateError);
        // Don't throw - DB update succeeded, JWT will sync eventually
      }
    } catch (authError) {
      console.error('Error updating auth metadata:', authError);
      // Don't throw - DB update succeeded
    }

    // Return user info for email notification
    return {
      success: true,
      user: {
        email: application.user?.email || '',
        name: application.user?.displayName || application.user?.username || '',
        username: application.user?.username || '',
      },
    };
  }

  // Reject creator application
  static async rejectApplication(
    applicationId: string,
    adminId: string,
    reason?: string
  ) {
    // Get the application
    const application = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.id, applicationId),
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application already reviewed');
    }

    // Update application status
    await db.update(creatorApplications)
      .set({
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(creatorApplications.id, applicationId));

    return { success: true };
  }

  // Get all users with filters
  static async getUsers(
    role?: 'fan' | 'creator' | 'admin',
    search?: string,
    _status?: 'active' | 'suspended' | 'banned', // Not implemented yet
    limit = 100,
    offset = 0
  ): Promise<{ users: any[]; total: number }> {
    try {
      // Build where conditions
      const conditions: any[] = [];

      if (role) {
        conditions.push(eq(users.role, role));
      }

      if (search) {
        conditions.push(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.username, `%${search}%`),
            ilike(users.displayName, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get users and total count in parallel
      const [usersList, totalResult] = await withTimeoutAndRetry(
        () => Promise.all([
          db.query.users.findMany({
            where: whereClause,
            orderBy: desc(users.createdAt),
            limit,
            offset,
            columns: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              role: true,
              isCreatorVerified: true,
              followerCount: true,
              followingCount: true,
              createdAt: true,
              accountStatus: true,
              storageUsed: true,
            },
          }),
          db.select({ count: count() }).from(users).where(whereClause),
        ]),
        { timeoutMs: 5000, retries: 1, tag: 'adminUsers' }
      );

      return {
        users: usersList,
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { users: [], total: 0 };
    }
  }

  // Update user role
  static async updateUserRole(
    userId: string,
    newRole: 'fan' | 'creator' | 'admin',
    options?: { verifyCreator?: boolean }
  ) {
    // Build update object
    const updateData: any = {
      role: newRole,
      updatedAt: new Date(),
    };

    // If promoting to creator, also verify them
    if (newRole === 'creator' && options?.verifyCreator !== false) {
      updateData.isCreatorVerified = true;
    }

    // Update database
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // If promoting to creator, create default settings
    if (newRole === 'creator') {
      // Create default creator settings
      await db.insert(creatorSettings)
        .values({
          userId,
          messageRate: 3, // 3 coins = $0.30 per message (minimum)
          callRatePerMinute: 25, // 25 coins/min = $2.50/min
          minimumCallDuration: 5,
          isAvailableForCalls: false,
          voiceCallRatePerMinute: 15, // 15 coins/min = $1.50/min
          minimumVoiceCallDuration: 5,
          isAvailableForVoiceCalls: false,
        })
        .onConflictDoNothing();

      // Create default AI Twin settings
      await db.insert(aiTwinSettings)
        .values({
          creatorId: userId,
          enabled: false,
          textChatEnabled: false,
          voice: 'ara',
          pricePerMinute: 20,
          minimumMinutes: 5,
          maxSessionMinutes: 60,
          textPricePerMessage: 5,
        })
        .onConflictDoNothing();
    }

    // 🔥 CRITICAL: Update Supabase auth app_metadata to put role in JWT
    // This ensures role persists across sessions and prevents downgrades
    try {
      const metadata: any = { role: newRole };
      if (newRole === 'creator' && options?.verifyCreator !== false) {
        metadata.is_creator_verified = true;
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata: metadata,
          user_metadata: newRole === 'creator' ? { is_creator_verified: true } : undefined,
        }
      );

      if (updateError) {
        console.error('Failed to update auth metadata for role change:', updateError);
        // Don't throw - DB update succeeded, JWT will sync eventually
      }
    } catch (authError) {
      console.error('Error updating auth metadata:', authError);
      // Don't throw - DB update succeeded
    }

    // Send notifications when promoting to creator
    if (newRole === 'creator') {
      // Get user details for notifications
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          email: true,
          displayName: true,
          username: true,
        },
      });

      if (user?.email && user?.username) {
        const name = user.displayName || user.username;

        // Send welcome email (async, don't block)
        sendCreatorApprovalEmail({
          email: user.email,
          name,
          username: user.username,
        }).then(() => {
          console.log(`[Admin] Sent creator welcome email to ${user.email}`);
        }).catch((err) => {
          console.error(`[Admin] Failed to send creator welcome email:`, err);
        });

        // Add to creators audience for weekly emails
        addCreatorToAudience({
          email: user.email,
          name,
          username: user.username,
        }).catch((err) => {
          console.error(`[Admin] Failed to add to creators audience:`, err);
        });

        // Send in-app notification
        NotificationService.sendNotification(
          userId,
          'system',
          "You're now a Creator! 🎉",
          'Welcome to the creator family! You can now go live, offer calls, and start earning.',
          '/creator/dashboard',
          undefined,
          { type: 'creator_approved' }
        ).then(() => {
          console.log(`[Admin] Sent creator in-app notification to ${userId}`);
        }).catch((err) => {
          console.error(`[Admin] Failed to send in-app notification:`, err);
        });
      }
    }

    return { success: true };
  }

  /**
   * Set or remove admin status for a user
   * Updates both DB and Supabase auth metadata to keep them in sync
   */
  static async setAdminStatus(userId: string, isAdmin: boolean) {
    // Update database
    await db.update(users)
      .set({
        isAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Sync to Supabase auth app_metadata so middleware/client can check without DB
    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata: { isAdmin },
        }
      );

      if (updateError) {
        console.error('[AdminService] Failed to sync isAdmin to auth metadata:', updateError);
        // Don't throw - DB update succeeded, auth will sync eventually
      } else {
        console.log('[AdminService] Admin status synced to auth metadata:', { userId, isAdmin });
      }
    } catch (authError) {
      console.error('[AdminService] Error syncing admin status to auth:', authError);
      // Don't throw - DB update succeeded
    }

    return { success: true, isAdmin };
  }

  // Toggle creator verification
  static async toggleCreatorVerification(userId: string) {
    // Get current verification status
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { isCreatorVerified: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Toggle the verification status
    const newVerificationStatus = !user.isCreatorVerified;

    await db.update(users)
      .set({
        isCreatorVerified: newVerificationStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true, isVerified: newVerificationStatus };
  }

  // Toggle hide from discovery
  static async toggleHideFromDiscovery(userId: string) {
    // Get current hidden status
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { isHiddenFromDiscovery: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Toggle the hidden status
    const newHiddenStatus = !user.isHiddenFromDiscovery;

    await db.update(users)
      .set({
        isHiddenFromDiscovery: newHiddenStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true, isHidden: newHiddenStatus };
  }

  // Get platform statistics - optimized with COUNT queries
  static async getStatistics() {
    // Get date ranges for signup counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run all counts in parallel for speed
    const [totalUsersResult, totalCreatorsResult, totalFansResult, totalAdminsResult, pendingAppsResult, pendingPayoutsResult, todaySignupsResult, weekSignupsResult] = await withTimeoutAndRetry(
      () => Promise.all([
        // Count total users
        db.select({ count: count() }).from(users),
        // Count creators only
        db.select({ count: count() }).from(users).where(eq(users.role, 'creator')),
        // Count fans only
        db.select({ count: count() }).from(users).where(eq(users.role, 'fan')),
        // Count admins only
        db.select({ count: count() }).from(users).where(eq(users.role, 'admin')),
        // Count pending applications
        db.select({ count: count() }).from(creatorApplications).where(eq(creatorApplications.status, 'pending')),
        // Count pending payouts and total amount
        db.select({
          count: count(),
          totalAmount: sum(payoutRequests.amount),
        }).from(payoutRequests).where(eq(payoutRequests.status, 'pending')),
        // Count today's creator signups
        db.select({ count: count() }).from(users).where(and(gte(users.createdAt, today), eq(users.role, 'creator'))),
        // Count last 7 days creator signups
        db.select({ count: count() }).from(users).where(and(gte(users.createdAt, sevenDaysAgo), eq(users.role, 'creator'))),
      ]),
      { timeoutMs: 3000, retries: 1, tag: 'adminStats' }
    );

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalCreators: totalCreatorsResult[0]?.count || 0,
      totalFans: totalFansResult[0]?.count || 0,
      totalAdmins: totalAdminsResult[0]?.count || 0,
      pendingApplications: pendingAppsResult[0]?.count || 0,
      pendingPayouts: pendingPayoutsResult[0]?.count || 0,
      pendingPayoutAmount: Number(pendingPayoutsResult[0]?.totalAmount) || 0,
      todaySignups: todaySignupsResult[0]?.count || 0,
      weekSignups: weekSignupsResult[0]?.count || 0,
    };
  }
}
