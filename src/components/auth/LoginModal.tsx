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
          className="h-10 w-auto"
          priority
        />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" action="javascript:void(0)">
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
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-lg font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="text-center text-gray-700">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-digis-cyan hover:underline font-semibold"
          >
            Sign up
          </button>
        </div>
      </form>
    </GlassModal>
  );
}
