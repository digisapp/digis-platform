'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner, PasswordInput } from '@/components/ui';
import { CheckCircle, ArrowLeft } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
}

export function LoginModal({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');


  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== FORM SUBMIT STARTED ===');
    e.preventDefault();
    e.stopPropagation();

    setError('');
    setLoading(true);

    try {
      console.log('Login attempt:', { email });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);

      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Set session on client side for immediate access
      if (data.session) {
        const supabase = (await import('@/lib/supabase/client')).createClient();
        await supabase.auth.setSession(data.session);
      }

      // Redirect based on user role
      const role = data.user?.role;
      let redirectPath = '/explore';

      if (role === 'admin') {
        redirectPath = '/admin';
      } else if (role === 'creator') {
        redirectPath = '/creator/dashboard';
      }

      console.log('Login successful, redirecting to:', redirectPath);

      // Force a full page reload to ensure session is recognized
      window.location.replace(redirectPath);
    } catch (err) {
      console.error('Login error:', err);
      // Handle network errors vs API errors
      if (err instanceof Error) {
        if (err.message === 'fetch failed' || err.message.includes('NetworkError')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setResetSuccess(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSuccess(false);
    setResetError('');
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex justify-center mb-8">
        <Image
          src="/images/digis-logo-white.png"
          alt="Digis Logo"
          width={150}
          height={50}
          className="h-12 w-auto"
          priority
        />
      </div>

      {/* Forgot Password View */}
      {showForgotPassword ? (
        <div className="space-y-5">
          {resetSuccess ? (
            // Success message
            <div className="text-center py-4">
              <div className="p-3 bg-green-500/20 rounded-full inline-block mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
              <p className="text-gray-300 text-sm mb-6">
                If an account exists with <span className="font-semibold text-white">{resetEmail}</span>, you&apos;ll receive a password reset link shortly.
              </p>
              <button
                type="button"
                onClick={handleBackToLogin}
                className="text-digis-cyan hover:text-digis-pink transition-colors font-semibold flex items-center gap-2 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>
            </div>
          ) : (
            // Reset form
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="text-center mb-2">
                <h3 className="text-xl font-bold text-white mb-2">Forgot Password?</h3>
                <p className="text-gray-400 text-sm">
                  Enter your email and we&apos;ll send you a reset link
                </p>
              </div>

              <GlassInput
                type="email"
                label="Email"
                placeholder="your@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />

              {resetError && (
                <div className="p-4 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-300 text-sm font-semibold">
                  {resetError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading || !resetEmail}
                className="w-full px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {resetLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        // Login Form
        <form onSubmit={handleSubmit} className="space-y-5" action="javascript:void(0)">
          <GlassInput
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div>
            <PasswordInput
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(email); // Pre-fill with login email if entered
                }}
                className="text-sm text-gray-400 hover:text-digis-cyan transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-300 text-sm font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink text-white rounded-2xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : 'Sign In'}
          </button>

          <div className="text-center text-white text-sm md:text-base font-medium">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-digis-cyan hover:text-digis-pink transition-colors font-bold underline"
            >
              Sign up
            </button>
          </div>
        </form>
      )}
    </GlassModal>
  );
}
