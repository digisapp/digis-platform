import { User } from '@supabase/supabase-js';
import { AdminService } from './admin-service';

/**
 * Check if user is admin
 *
 * SECURITY: Admin status is determined ONLY by the database isAdmin flag.
 * Hardcoded email lists have been removed to prevent security vulnerabilities.
 *
 * To make someone admin:
 * - Use the admin dashboard
 * - Or run: UPDATE users SET is_admin = true WHERE email = 'user@example.com';
 */
export async function isAdminUser(user: User): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  // Check DB via AdminService - this is the ONLY source of truth
  try {
    return await AdminService.isAdmin(user.id);
  } catch (e) {
    console.error('[isAdminUser] DB check failed:', e);
    return false;
  }
}
