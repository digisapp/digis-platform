'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner, PasswordInput } from '@/components/ui';

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

      // Short delay to ensure session is set
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect based on user role
      const role = data.user?.role;
      let redirectPath = '/dashboard';

      if (role === 'admin') {
        redirectPath = '/admin';
      } else if (role === 'creator') {
        redirectPath = '/creator/dashboard';
      }

      console.log('Login successful, redirecting to:', redirectPath);
      window.location.href = redirectPath;
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex justify-center mb-6">
        <Image
          src="/images/digis-logo-black.png"
          alt="Digis Logo"
          width={150}
          height={50}
          className="h-12 w-auto"
          priority
        />
      </div>
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Welcome Back!</h2>
        <p className="text-gray-600 font-medium">Sign in to continue your journey</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5" action="javascript:void(0)">
        <GlassInput
          type="email"
          label="Email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-700 text-sm font-semibold">
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

        <div className="text-center text-gray-700 text-sm md:text-base font-medium">
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
    </GlassModal>
  );
}
