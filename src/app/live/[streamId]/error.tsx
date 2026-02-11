'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function ViewerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Viewer Error]', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Stream Error</h1>
        <p className="text-gray-400 mb-6">Something went wrong loading this stream.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity">
            Try Again
          </button>
          <a href="/explore" className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
            Browse Streams
          </a>
        </div>
      </div>
    </div>
  );
}
