import { createClient } from '@supabase/supabase-js';

// Initialize admin client
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export class AdminService {
  // Check if user is admin
  static async isAdmin(userId: string): Promise<boolean> {
    const client = getAdminClient();
    const { data: user } = await client
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    return user?.role === 'admin';
  }

  // Get all pending creator applications
  static async getPendingApplications(limit = 50, offset = 0) {
    const client = getAdminClient();

    const { data: applications, error } = await client
      .from('creator_applications')
      .select(`
        *,
        user:users!creator_applications_user_id_fkey(
          id,
          email,
          username,
          avatar_url,
          created_at
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching pending applications:', error);
      return [];
    }

    return applications || [];
  }

  // Get all applications (with filters)
  static async getAllApplications(
    status?: 'pending' | 'approved' | 'rejected',
    limit = 50,
    offset = 0
  ) {
    const client = getAdminClient();

    let query = client
      .from('creator_applications')
      .select(`
        *,
        user:users!creator_applications_user_id_fkey(id, email, username, avatar_url, created_at)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      return [];
    }

    return data || [];
  }

  // Approve creator application
  static async approveApplication(applicationId: string, adminId: string) {
    const client = getAdminClient();

    // Get the application
    const { data: application, error: fetchError } = await client
      .from('creator_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application already reviewed');
    }

    // Update application status
    const { error: updateAppError } = await client
      .from('creator_applications')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateAppError) {
      throw new Error(`Failed to update application: ${updateAppError.message}`);
    }

    // Update user to creator role
    const { error: updateUserError } = await client
      .from('users')
      .update({
        role: 'creator',
        is_creator_verified: true,
        display_name: application.display_name,
        bio: application.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', application.user_id);

    if (updateUserError) {
      throw new Error(`Failed to update user: ${updateUserError.message}`);
    }

    return { success: true };
  }

  // Reject creator application
  static async rejectApplication(
    applicationId: string,
    adminId: string,
    reason?: string
  ) {
    const client = getAdminClient();

    // Get the application
    const { data: application, error: fetchError } = await client
      .from('creator_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'pending') {
      throw new Error('Application already reviewed');
    }

    // Update application status
    const { error: updateError } = await client
      .from('creator_applications')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      throw new Error(`Failed to update application: ${updateError.message}`);
    }

    return { success: true };
  }

  // Get all users with filters
  static async getUsers(
    role?: 'fan' | 'creator' | 'admin',
    search?: string,
    status?: 'active' | 'suspended' | 'banned',
    limit = 50,
    offset = 0
  ) {
    const client = getAdminClient();

    let query = client
      .from('users')
      .select('id, email, username, display_name, avatar_url, role, is_creator_verified, follower_count, following_count, created_at, account_status')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply role filter
    if (role) {
      query = query.eq('role', role);
    }

    // Apply status filter
    if (status) {
      query = query.eq('account_status', status);
    }

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data: usersList, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return usersList || [];
  }

  // Update user role
  static async updateUserRole(
    userId: string,
    newRole: 'fan' | 'creator' | 'admin'
  ) {
    const client = getAdminClient();

    const { error } = await client
      .from('users')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    return { success: true };
  }

  // Toggle creator verification
  static async toggleCreatorVerification(userId: string) {
    const client = getAdminClient();

    // Get current verification status
    const { data: user, error: fetchError } = await client
      .from('users')
      .select('is_creator_verified')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      throw new Error('User not found');
    }

    // Toggle the verification status
    const newVerificationStatus = !user.is_creator_verified;

    const { error: updateError } = await client
      .from('users')
      .update({
        is_creator_verified: newVerificationStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update verification: ${updateError.message}`);
    }

    return { success: true, isVerified: newVerificationStatus };
  }

  // Get platform statistics
  static async getStatistics() {
    const client = getAdminClient();

    // Get total users count
    const { count: totalUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total creators count
    const { count: totalCreators } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'creator');

    // Get pending applications count
    const { count: pendingApps } = await client
      .from('creator_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      totalUsers: totalUsers || 0,
      totalCreators: totalCreators || 0,
      pendingApplications: pendingApps || 0,
    };
  }
}
