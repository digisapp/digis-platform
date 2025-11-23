'use client';

import { useState } from 'react';
import { GlassModal, GlassButton, LoadingSpinner } from '@/components/ui';
import { sendVerificationEmail, VerificationRequiredAction, getVerificationMessage } from '@/lib/email-verification';

interface VerifyEmailPromptProps {
  isOpen: boolean;
  onClose: () => void;
  action: VerificationRequiredAction;
  email: string;
}

export function VerifyEmailPrompt({ isOpen, onClose, action, email }: VerifyEmailPromptProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendVerification = async () => {
    setLoading(true);
    setError('');

    const result = await sendVerificationEmail();

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || 'Failed to send verification email');
    }

    setLoading(false);
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="space-y-6 text-center">
        {!sent ? (
          <>
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink p-6 rounded-full">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink">
                Verify Your Email
              </h3>
              <p className="text-base text-white font-medium">
                {getVerificationMessage(action)}
              </p>
              <p className="text-sm text-gray-400">
                We'll send a verification link to:
              </p>
              <p className="text-base text-digis-cyan font-semibold">
                {email}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <GlassButton
                onClick={handleSendVerification}
                disabled={loading}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Send Verification Email'}
              </GlassButton>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-white/5 text-gray-300 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-green-500 p-6 rounded-full">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-black text-white">
                Check Your Email!
              </h3>
              <p className="text-base text-gray-300">
                We've sent a verification link to <span className="text-digis-cyan font-semibold">{email}</span>
              </p>
              <p className="text-sm text-gray-400">
                Click the link in the email to verify your account.
              </p>
            </div>

            <GlassButton
              onClick={onClose}
              variant="gradient"
              size="lg"
              className="w-full"
            >
              Got It!
            </GlassButton>
          </>
        )}
      </div>
    </GlassModal>
  );
}
