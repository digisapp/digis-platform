'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GlassModal, GlassInput, GlassButton, LoadingSpinner, PasswordInput } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Sign up with Supabase Auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) {
        throw signupError;
      }

      if (!data.user) {
        throw new Error('Signup failed - no user returned');
      }

      // Clear form
      setEmail('');
      setPassword('');

      // Close modal and redirect to username setup
      onClose();
      router.push('/welcome/username');

    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

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
      <form onSubmit={handleSubmit} className="space-y-5">
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
              <span>Creating account...</span>
            </div>
          ) : 'Get Started →'}
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
    </GlassModal>
  );
}
