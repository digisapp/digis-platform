'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GlassCard, GlassButton, LoadingSpinner, PasswordInput } from '@/components/ui';
import { CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Supabase sets a session when user clicks the recovery link
      setIsValidSession(!!session);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to explore page after 2 seconds
      setTimeout(() => {
        router.push('/explore');
      }, 2000);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Invalid or expired link
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/digis-logo-white.png"
              alt="Digis Logo"
              width={150}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </div>

          <div className="p-4 bg-red-500/20 rounded-xl border border-red-500/50 mb-6">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white mb-2">Invalid or Expired Link</h2>
            <p className="text-gray-300 text-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>

          <GlassButton
            variant="gradient"
            onClick={() => router.push('/')}
            className="w-full"
          >
            Back to Home
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/digis-logo-white.png"
              alt="Digis Logo"
              width={150}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </div>

          <div className="p-4 bg-green-500/20 rounded-xl border border-green-500/50 mb-6">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Password Updated!</h2>
            <p className="text-gray-300">
              Your password has been successfully updated. Redirecting you now...
            </p>
          </div>

          <LoadingSpinner size="sm" />
        </GlassCard>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 bottom-10 right-10 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <GlassCard className="max-w-md w-full p-8 relative z-10">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/digis-logo-white.png"
            alt="Digis Logo"
            width={150}
            height={50}
            className="h-12 w-auto"
            priority
          />
        </div>

        <div className="text-center mb-6">
          <div className="p-3 bg-digis-cyan/20 rounded-xl inline-block mb-3">
            <Lock className="w-8 h-8 text-digis-cyan" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
          <p className="text-gray-400 text-sm">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordInput
            label="New Password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          {error && (
            <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <GlassButton
            type="submit"
            variant="gradient"
            disabled={loading || !password || !confirmPassword}
            className="w-full"
            shimmer
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Updating...</span>
              </div>
            ) : (
              'Update Password'
            )}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
