'use client';

import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { useToastContext } from '@/context/ToastContext';
import type { ActiveStream } from './types';

interface GoLiveActiveStreamProps {
  activeStream: ActiveStream;
  isMobile: boolean;
  onStreamEnded: () => void;
}

export function GoLiveActiveStream({ activeStream, isMobile, onStreamEnded }: GoLiveActiveStreamProps) {
  const router = useRouter();
  const { showError } = useToastContext();

  const streamDuration = activeStream.startedAt
    ? Math.floor((Date.now() - new Date(activeStream.startedAt).getTime()) / 60000)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 md:pl-20">
      <div className="max-w-md w-full backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-red-500/50 p-8 text-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
        {/* Pulsing Live Indicator */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative bg-red-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              LIVE NOW
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Your Stream is Still Live!</h1>
        <p className="text-xl text-cyan-400 font-semibold mb-4">&quot;{activeStream.title}&quot;</p>

        {/* Stream Stats */}
        <div className="flex justify-center gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{activeStream.currentViewers}</div>
            <div className="text-sm text-gray-400">Viewers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{streamDuration}</div>
            <div className="text-sm text-gray-400">Minutes</div>
          </div>
        </div>

        <p className="text-gray-300 mb-8">
          {isMobile
            ? 'Control your stream from this device - chat, goals, polls, and more.'
            : 'Rejoin to continue streaming, or control from another device.'}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {isMobile ? (
            <>
              <GlassButton
                variant="gradient"
                size="lg"
                onClick={() => router.push(`/stream/control/${activeStream.id}`)}
                className="w-full"
                shimmer
                glow
              >
                <span className="mr-2">🎛️</span>
                Remote Control
              </GlassButton>
              <button
                onClick={() => router.push(`/stream/live/${activeStream.id}`)}
                className="w-full py-3 px-6 bg-white/5 border border-white/20 rounded-xl text-gray-300 hover:bg-white/10 transition-all"
              >
                <span className="mr-2">🔴</span>
                Rejoin as Host
              </button>
            </>
          ) : (
            <>
              <GlassButton
                variant="gradient"
                size="lg"
                onClick={() => router.push(`/stream/live/${activeStream.id}`)}
                className="w-full"
                shimmer
                glow
              >
                <span className="mr-2">🔴</span>
                Rejoin Stream
              </GlassButton>
              <button
                onClick={() => router.push(`/stream/control/${activeStream.id}`)}
                className="w-full py-3 px-6 bg-white/5 border border-white/20 rounded-xl text-gray-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
              >
                <span className="mr-2">🎛️</span>
                Remote Control (Phone)
              </button>
            </>
          )}

          <button
            onClick={async () => {
              if (!confirm('Are you sure you want to end this stream? This cannot be undone.')) return;
              try {
                const res = await fetch(`/api/streams/${activeStream.id}/end`, { method: 'POST' });
                if (res.ok) {
                  onStreamEnded();
                } else {
                  showError('Failed to end stream');
                }
              } catch (e) {
                showError('Failed to end stream');
              }
            }}
            className="w-full py-3 px-6 bg-white/5 border border-white/20 rounded-xl text-gray-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all"
          >
            End Stream & Start New
          </button>
        </div>
      </div>
    </div>
  );
}
