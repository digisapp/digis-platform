import { db } from '@/lib/data/system';
import { users, creatorApplications, payoutRequests, creatorSettings } from '@/lib/data/system';
import { eq, and, or, ilike, desc, count, sql, sum } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withTimeoutAndRetry } from '@/lib/async-utils';

export class AdminService {
  // Check if user is admin (checks email first, then isAdmin flag, then role)
  static async isAdmin(userId: string): Promise<boolean> {
    // Hardcoded admin emails - ALWAYS grant access to these
    const defaultAdmins = ['nathan@digis.cc', 'admin@digis.cc', 'nathan@examodels.com', 'nathanmayell@gmail.com'];
    const envAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = [...new Set([...defaultAdmins, ...envAdmins])];

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
      // If DB fails, we can't check - deny access
      return false;
    }

    if (!user) {
      console.log('[AdminService] User not found:', userId);
      return false;
    }

    // PRIMARY CHECK: Is email in admin list? (most reliable)
    const isAdminByEmail = user.email && adminEmails.includes(user.email.toLowerCase());
    if (isAdminByEmail) {
      console.log('[AdminService] Admin access granted by email:', user.email);
      return true;
    }

    // SECONDARY: Check isAdmin flag in DB
    if (user.isAdmin === true) {
      console.log('[AdminService] Admin access granted by isAdmin flag:', user.email);
      return true;
    }

    // LEGACY: Check if role is 'admin'
    if (user.role === 'admin') {
      console.log('[AdminService] Admin access granted by role:', user.email);
      return true;
    }

    console.log('[AdminService] Admin access DENIED for:', user.email, { isAdmin: user.isAdmin, role: user.role });
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

    // Create default creator settings with 25 coin message rate
    await db.insert(creatorSettings)
      .values({
        userId: application.userId,
        messageRate: 25, // Default 25 coins per message
        callRatePerMinute: 100,
        minimumCallDuration: 5,
        isAvailableForCalls: false,
        voiceCallRatePerMinute: 50,
        minimumVoiceCallDuration: 5,
        isAvailableForVoiceCalls: false,
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

    return { success: true };
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

    // If promoting to creator, create default creator settings
    if (newRole === 'creator') {
      await db.insert(creatorSettings)
        .values({
          userId,
          messageRate: 25, // Default 25 coins per message
          callRatePerMinute: 100,
          minimumCallDuration: 5,
          isAvailableForCalls: false,
          voiceCallRatePerMinute: 50,
          minimumVoiceCallDuration: 5,
          isAvailableForVoiceCalls: false,
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

    return { success: true };
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

  // Get platform statistics - optimized with COUNT queries
  static async getStatistics() {
    // Run all counts in parallel for speed
    const [totalUsersResult, totalCreatorsResult, pendingAppsResult, pendingPayoutsResult] = await withTimeoutAndRetry(
      () => Promise.all([
        // Count total users
        db.select({ count: count() }).from(users),
        // Count creators only
        db.select({ count: count() }).from(users).where(eq(users.role, 'creator')),
        // Count pending applications
        db.select({ count: count() }).from(creatorApplications).where(eq(creatorApplications.status, 'pending')),
        // Count pending payouts and total amount
        db.select({
          count: count(),
          totalAmount: sum(payoutRequests.amount),
        }).from(payoutRequests).where(eq(payoutRequests.status, 'pending')),
      ]),
      { timeoutMs: 3000, retries: 1, tag: 'adminStats' }
    );

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalCreators: totalCreatorsResult[0]?.count || 0,
      pendingApplications: pendingAppsResult[0]?.count || 0,
      pendingPayouts: pendingPayoutsResult[0]?.count || 0,
      pendingPayoutAmount: Number(pendingPayoutsResult[0]?.totalAmount) || 0,
    };
  }
}
