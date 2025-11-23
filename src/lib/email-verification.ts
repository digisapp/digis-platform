/**
 * Email Verification Utility
 *
 * Handles optional email verification for sensitive actions.
 * Users can sign up without verification, but must verify for:
 * - Payments/purchases
 * - Becoming a creator
 * - Withdrawing earnings
 * - Sensitive account changes
 */

import { createClient } from '@/lib/supabase/client';

export interface VerificationStatus {
  isVerified: boolean;
  email: string | null;
  needsVerification: boolean;
}

/**
 * Check if user's email is verified
 */
export async function checkEmailVerification(): Promise<VerificationStatus> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      isVerified: false,
      email: null,
      needsVerification: false,
    };
  }

  // Check if email is confirmed
  const isVerified = !!user.email_confirmed_at;

  return {
    isVerified,
    email: user.email || null,
    needsVerification: !isVerified,
  };
}

/**
 * Send verification email to current user
 */
export async function sendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return { success: false, error: 'No email address found' };
    }

    // If already verified, no need to send
    if (user.email_confirmed_at) {
      return { success: true };
    }

    // Resend verification email using Supabase's resend functionality
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-success`,
      },
    });

    if (error) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error sending verification email:', err);
    return { success: false, error: err.message || 'Failed to send verification email' };
  }
}

/**
 * Actions that require email verification
 */
export enum VerificationRequiredAction {
  PURCHASE = 'purchase',
  BECOME_CREATOR = 'become_creator',
  WITHDRAW_EARNINGS = 'withdraw_earnings',
  CHANGE_EMAIL = 'change_email',
  DELETE_ACCOUNT = 'delete_account',
}

/**
 * Check if action requires email verification
 */
export function requiresVerification(action: VerificationRequiredAction): boolean {
  // All specified actions require verification
  return true;
}

/**
 * Get user-friendly message for why verification is needed
 */
export function getVerificationMessage(action: VerificationRequiredAction): string {
  const messages = {
    [VerificationRequiredAction.PURCHASE]:
      'Please verify your email to make purchases and support creators.',
    [VerificationRequiredAction.BECOME_CREATOR]:
      'Email verification is required to become a creator and receive payments.',
    [VerificationRequiredAction.WITHDRAW_EARNINGS]:
      'Verify your email to withdraw your earnings securely.',
    [VerificationRequiredAction.CHANGE_EMAIL]:
      'Email verification is required to change your account email.',
    [VerificationRequiredAction.DELETE_ACCOUNT]:
      'Please verify your email before deleting your account.',
  };

  return messages[action] || 'This action requires email verification.';
}
