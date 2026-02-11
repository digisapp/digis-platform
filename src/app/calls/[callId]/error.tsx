'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function CallError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Call Error]', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Call Error</h1>
        <p className="text-gray-400 mb-6">Something went wrong with the video call.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity">
            Try Again
          </button>
          <a href="/dashboard" className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
