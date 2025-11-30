import { db } from '@/lib/data/system';
import { users, creatorApplications } from '@/lib/data/system';
import { eq, and, or, ilike, desc, count, sql } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withTimeoutAndRetry } from '@/lib/async-utils';

export class AdminService {
  // Check if user is admin
  static async isAdmin(userId: string): Promise<boolean> {
    const user = await withTimeoutAndRetry(
      () => db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true, email: true },
      }),
      { timeoutMs: 5000, retries: 1, tag: 'isAdmin' }
    );

    // Also check ADMIN_EMAILS env var as fallback
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isAdminByEmail = user?.email && adminEmails.includes(user.email.toLowerCase());

    // If user should be admin by email but isn't in DB, auto-promote
    if (isAdminByEmail && user?.role !== 'admin') {
      try {
        await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
        console.log(`[AdminService] Auto-promoted ${user.email} to admin role`);
        return true;
      } catch (e) {
        console.error('[AdminService] Failed to auto-promote:', e);
      }
    }

    return user?.role === 'admin' || isAdminByEmail;
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
        { timeoutMs: 8000, retries: 1, tag: 'pendingApps' }
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
        { timeoutMs: 8000, retries: 1, tag: 'allApps' }
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
    limit = 50,
    offset = 0
  ) {
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

      const usersList = await withTimeoutAndRetry(
        () => db.query.users.findMany({
          where: conditions.length > 0 ? and(...conditions) : undefined,
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
          },
        }),
        { timeoutMs: 8000, retries: 1, tag: 'adminUsers' }
      );

      return usersList;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // Update user role
  static async updateUserRole(
    userId: string,
    newRole: 'fan' | 'creator' | 'admin'
  ) {
    // Update database
    await db.update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 🔥 CRITICAL: Update Supabase auth app_metadata to put role in JWT
    // This ensures role persists across sessions and prevents downgrades
    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          app_metadata: { role: newRole },
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
    const [totalUsersResult, totalCreatorsResult, pendingAppsResult] = await withTimeoutAndRetry(
      () => Promise.all([
        // Count total users
        db.select({ count: count() }).from(users),
        // Count creators only
        db.select({ count: count() }).from(users).where(eq(users.role, 'creator')),
        // Count pending applications
        db.select({ count: count() }).from(creatorApplications).where(eq(creatorApplications.status, 'pending')),
      ]),
      { timeoutMs: 8000, retries: 1, tag: 'adminStats' }
    );

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalCreators: totalCreatorsResult[0]?.count || 0,
      pendingApplications: pendingAppsResult[0]?.count || 0,
    };
  }
}
