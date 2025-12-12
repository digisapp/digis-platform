'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Coins, CheckCircle, XCircle } from 'lucide-react';

function CheckoutCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    // Check the session status
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${sessionId}`);
        const data = await response.json();

        if (data.status === 'complete') {
          setStatus('success');
        } else if (data.status === 'open') {
          // Payment still processing, wait a bit and check again
          setTimeout(checkStatus, 1000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error checking session status:', error);
        // Assume success if we can't check - the webhook will handle the actual credit
        setStatus('success');
      }
    };

    checkStatus();
  }, [sessionId]);

  // Auto-close countdown after success
  useEffect(() => {
    if (status !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Close this window/tab or redirect
          window.close();
          // Fallback if window.close doesn't work
          router.push('/wallet');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white mt-4">Processing payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-black/40 backdrop-blur-xl rounded-2xl border border-red-500/30 p-8">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Payment Issue</h1>
          <p className="text-gray-400 mb-6">
            There was an issue processing your payment. Please try again.
          </p>
          <button
            onClick={() => router.push('/wallet')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-black/40 backdrop-blur-xl rounded-2xl border border-green-500/30 p-8">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Coins className="w-6 h-6 text-green-400" />
          <span className="text-xl font-bold text-green-400">Coins Added!</span>
        </div>
        <p className="text-gray-400 mb-6">
          Closing in {countdown}...
        </p>
        <button
          onClick={() => window.close()}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:scale-105 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <CheckoutCompleteContent />
    </Suspense>
  );
}
