'use client';

import React from 'react';

interface StreamEndedOverlayProps {
  creatorUsername: string;
  onNavigate: (path: string) => void;
}

export function StreamEndedOverlay({ creatorUsername, onNavigate }: StreamEndedOverlayProps) {
  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center p-8 max-w-md mx-auto">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-8">Stream has ended</h2>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => onNavigate(`/${creatorUsername}`)}
            className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all text-lg"
          >
            View Creator Profile
          </button>
          <button
            onClick={() => onNavigate('/watch')}
            className="w-full px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all text-lg"
          >
            Browse Live Streams
          </button>
          <button
            onClick={() => onNavigate('/')}
            className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
