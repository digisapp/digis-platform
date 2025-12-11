import { User } from '@supabase/supabase-js';
import { AdminService } from './admin-service';

// Admin emails from environment with sensible defaults
// Configure ADMIN_EMAILS env var as comma-separated emails for production
const DEFAULT_ADMIN_EMAILS = ['nathan@digis.cc', 'admin@digis.cc', 'nathan@examodels.com', 'nathanmayell@gmail.com'];
const ENV_ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const ADMIN_EMAILS = [...new Set([...DEFAULT_ADMIN_EMAILS, ...ENV_ADMIN_EMAILS])];

/**
 * Check if user is admin by email first (from JWT), then by DB
 * This bypasses DB issues for hardcoded admin emails
 */
export async function isAdminUser(user: User): Promise<boolean> {
  // PRIMARY: Check email directly from JWT (no DB required)
  const email = user.email?.toLowerCase() ?? '';
  if (ADMIN_EMAILS.includes(email)) {
    return true;
  }

  // FALLBACK: Check DB via AdminService
  try {
    return await AdminService.isAdmin(user.id);
  } catch (e) {
    console.error('[isAdminUser] DB check failed:', e);
    return false;
  }
}
