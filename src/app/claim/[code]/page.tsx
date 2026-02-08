'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui';
import { CheckCircle, XCircle, Eye, EyeOff, Instagram, Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface InviteData {
  valid: boolean;
  instagramHandle: string;
  displayName: string | null;
  email: string | null;
  hasEmail: boolean;
}

export default function ClaimInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdUsername, setCreatedUsername] = useState('');

  // Validate invite on load
  useEffect(() => {
    const validateInvite = async () => {
      try {
        const res = await fetch(`/api/claim/${code}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setInvite(data);
          if (data.email) {
            setEmail(data.email);
          }
        } else {
          setError(data.error || 'Invalid invite');
        }
      } catch (err) {
        setError('Failed to validate invite');
      } finally {
        setLoading(false);
      }
    };

    validateInvite();
  }, [code]);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!invite?.hasEmail && !email) {
      setError('Email is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/claim/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invite?.hasEmail ? undefined : email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setCreatedUsername(data.username);
      } else {
        setError(data.error || 'Failed to claim invite');
      }
    } catch (err) {
      setError('Failed to claim invite');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-400">Validating your invite...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired invite)
  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f] p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f] p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Digis!</h1>
          <p className="text-gray-400 mb-2">Your creator account has been created.</p>
          <p className="text-cyan-400 font-semibold mb-6">@{createdUsername}</p>

          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-semibold text-white mb-2">Next Steps:</h3>
            <ol className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">1.</span>
                Check your email to verify your account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">2.</span>
                Log in with your email and password
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">3.</span>
                Complete your profile and start creating!
              </li>
            </ol>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/25"
          >
            Log In Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  // Claim form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#121218] to-[#0a0a0f] p-4">
      <div className="max-w-md w-full">
        {/* Welcome Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-6">
          <div className="text-center mb-6">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/images/digis-logo-white.png"
                alt="Digis"
                width={120}
                height={40}
                className="mx-auto"
              />
            </Link>
            <h1 className="text-2xl font-bold text-white mb-2">
              Welcome, {invite?.displayName || `@${invite?.instagramHandle}`}!
            </h1>
            <p className="text-gray-400">
              You&apos;ve been invited to be a Creator on Digis.
            </p>
          </div>

          {/* Instagram Handle Display */}
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Your Digis username</div>
              <div className="text-white font-semibold">@{invite?.instagramHandle}</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (only if not pre-filled) */}
            {!invite?.hasEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            {/* Pre-filled email display */}
            {invite?.hasEmail && invite.email && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span className="text-white">{invite.email}</span>
                  <span className="text-xs text-green-400 ml-auto">Pre-filled</span>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-3">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating Account...
                </>
              ) : (
                <>
                  Claim Your Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          By claiming your account, you agree to our{' '}
          <Link href="/terms" className="text-cyan-400 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-cyan-400 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
