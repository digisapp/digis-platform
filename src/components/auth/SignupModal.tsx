'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner, PasswordInput } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { useToastContext } from '@/context/ToastContext';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  redirectTo?: string;
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin, redirectTo }: SignupModalProps) {
  const { showSuccess, showError } = useToastContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field - should stay empty
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleResend = async () => {
    if (!signupEmail) return;

    setResendLoading(true);
    try {
      const supabase = createClient();
      // Everyone goes to welcome page after verification
      const destinationUrl = (!redirectTo || redirectTo === '/') ? '/welcome' : redirectTo;
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
        options: {
          emailRedirectTo: `${window.location.origin}${destinationUrl}`,
        },
      });

      if (resendError) {
        throw resendError;
      }

      showSuccess('Confirmation email resent! Check your inbox.');
    } catch (err: any) {
      console.error('Resend error:', err);
      showError(err.message || 'Failed to resend email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check honeypot - bots will fill this
    if (website) {
      // Silently fail for bots
      setSuccess(true);
      setSignupEmail(email);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Everyone goes to welcome page after verification
      // Treat '/' or empty redirectTo as no destination — always send to /welcome
      const destinationUrl = (!redirectTo || redirectTo === '/') ? '/welcome' : redirectTo;

      // Sign up with Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${destinationUrl}`,
        },
      });

      if (signupError) {
        throw signupError;
      }

      if (!data.user) {
        throw new Error('Signup failed - no user returned');
      }

      // Create the user record in database
      // Note: If email matches a creator invite, they'll be auto-approved as creator
      const reserveResponse = await fetch('/api/auth/reserve-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          email,
          username: null, // No username at signup
          website, // Honeypot field
        }),
      });

      if (!reserveResponse.ok) {
        const reserveData = await reserveResponse.json();
        console.warn('User creation warning:', reserveData.error);
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSignupEmail(email);
        setSuccess(true);
        setEmail('');
        setPassword('');
        return;
      }

      // User is logged in immediately (no email confirmation required)
      setEmail('');
      setPassword('');
      onClose();
      router.push(destinationUrl);

    } catch (err: any) {
      console.error('Signup error:', err);
      // Handle specific Supabase errors with friendlier messages
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setError('This email is already registered. Please sign in instead.');
      } else {
        setError(err.message || 'An error occurred during signup');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email && password && password.length >= 6;

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="" size="sm">
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

      {success ? (
        <div className="space-y-6 text-center">
          {/* Animated Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink p-6 rounded-full">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink">
              Check Your Email!
            </h3>
            <p className="text-lg text-white font-semibold">
              We sent a confirmation link to{' '}
              <span className="text-digis-cyan">{signupEmail}</span>
            </p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Click the link in your email to verify your account and get started!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button
              onClick={() => {
                setSuccess(false);
                onSwitchToLogin();
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-lg"
            >
              Back to Sign In
            </button>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full px-6 py-3 bg-white/5 text-gray-300 rounded-xl font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </div>
              ) : 'Resend Email'}
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 pt-2">
            Didn't receive the email? Check your spam folder or click resend above.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <GlassInput
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <PasswordInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 -mt-2">At least 6 characters</p>

          {/* Honeypot field - hidden from real users, bots will fill it */}
          <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-400 text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="w-full px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating account...</span>
              </div>
            ) : 'Create Account →'}
          </button>

          <div className="text-center text-white text-sm md:text-base font-medium">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-digis-cyan hover:text-digis-pink transition-colors font-bold underline"
            >
              Sign in
            </button>
          </div>
        </form>
      )}
    </GlassModal>
  );
}
