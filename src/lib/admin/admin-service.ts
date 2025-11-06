import { db } from '@/db';
import { users, creatorApplications } from '@/db/schema';
import { eq, desc, and, or, ilike } from 'drizzle-orm';

export class AdminService {
  // Check if user is admin
  static async isAdmin(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true },
    });
    return user?.role === 'admin';
  }

  // Get all pending creator applications
  static async getPendingApplications(limit = 50, offset = 0) {
    const applications = await db.query.creatorApplications.findMany({
      where: eq(creatorApplications.status, 'pending'),
      orderBy: [desc(creatorApplications.createdAt)],
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
    });
    return applications;
  }

  // Get all applications (with filters)
  static async getAllApplications(
    status?: 'pending' | 'approved' | 'rejected',
    limit = 50,
    offset = 0
  ) {
    let query = db.query.creatorApplications.findMany({
      orderBy: [desc(creatorApplications.createdAt)],
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
        reviewer: {
          columns: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (status) {
      return await db.query.creatorApplications.findMany({
        where: eq(creatorApplications.status, status),
        orderBy: [desc(creatorApplications.createdAt)],
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
          reviewer: {
            columns: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });
    }

    return await query;
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
    await db
      .update(creatorApplications)
      .set({
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creatorApplications.id, applicationId));

    // Update user to creator role
    await db
      .update(users)
      .set({
        role: 'creator',
        isCreatorVerified: true,
        displayName: application.displayName,
        bio: application.bio,
        updatedAt: new Date(),
      })
      .where(eq(users.id, application.userId));

    return { success: true };
  }

  // Reject creator application
  static async rejectApplication(
    applicationId: string,
    adminId: string,
    reason?: string
  ) {
    const application = await db.query.creatorApplications.findFirst({
      where: eq(creatorApplications.id, applicationId),
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application already reviewed');
    }

    await db
      .update(creatorApplications)
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
    limit = 50,
    offset = 0
  ) {
    let conditions = [];

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

    const usersList = await db.query.users.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(users.createdAt)],
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
    });

    return usersList;
  }

  // Update user role
  static async updateUserRole(
    userId: string,
    newRole: 'fan' | 'creator' | 'admin'
  ) {
    await db
      .update(users)
      .set({
        role: newRole,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true };
  }

  // Toggle creator verification
  static async toggleCreatorVerification(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { isCreatorVerified: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await db
      .update(users)
      .set({
        isCreatorVerified: !user.isCreatorVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { success: true, isVerified: !user.isCreatorVerified };
  }

  // Get platform statistics
  static async getStatistics() {
    const [totalUsers] = await db
      .select({ count: db.$count(users) })
      .from(users);

    const [totalCreators] = await db
      .select({ count: db.$count(users) })
      .from(users)
      .where(eq(users.role, 'creator'));

    const [pendingApps] = await db
      .select({ count: db.$count(creatorApplications) })
      .from(creatorApplications)
      .where(eq(creatorApplications.status, 'pending'));

    return {
      totalUsers: totalUsers.count,
      totalCreators: totalCreators.count,
      pendingApplications: pendingApps.count,
    };
  }
}
