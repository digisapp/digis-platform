'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { streamAnalytics } from '@/lib/utils/analytics';
import { useRouter } from 'next/navigation';
import { StreamAccessModal } from '@/components/live/StreamAccessModal';
import { Users, Clock, Play } from 'lucide-react';

const LivePlayer = dynamic(() => import('@/components/live/LivePlayer'), { ssr: false });

type Status = {
  state: 'live' | 'upcoming' | 'ended' | 'idle';
  streamId?: string;
  kind?: string;
  priceCents?: number;
  hasAccess?: boolean;
  startsAt?: string | null;
  streamTitle?: string;
  creatorName?: string;
  currentViewers?: number;
};

interface ProfileLiveSectionProps {
  username: string;
}

export default function ProfileLiveSection({ username }: ProfileLiveSectionProps) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [inView, setInView] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Lazy initialize using IntersectionObserver
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: '200px' }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  // Retry-friendly status loader with exponential backoff
  useEffect(() => {
    let alive = true;
    let retryDelay = 1200;

    const load = async (retries = 3) => {
      try {
        const r = await fetch(
          `/api/streams/status?username=${encodeURIComponent(username)}`,
          { cache: 'no-store' }
        );
        const data = (await r.json()) as Status;
        if (alive) {
          setStatus(data);
          retryDelay = 1200;
        }
      } catch (error) {
        console.error('[ProfileLiveSection] Load error:', error);
        if (retries > 0 && alive) {
          setTimeout(() => alive && load(retries - 1), retryDelay);
          retryDelay *= 2;
        }
      }
    };

    load();
    const interval = setInterval(() => load(), 8000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [username]);

  const handleClick = () => {
    if (status.streamId) {
      router.push(`/live/${status.streamId}`);
      streamAnalytics.theaterModeClicked(username, status.streamId);
    }
  };

  // Don't render anything if not live or upcoming
  if (status.state === 'idle' || status.state === 'ended') {
    return null;
  }

  return (
    <section ref={ref} className="mb-6">
      {/* Upcoming state */}
      {status.state === 'upcoming' && (
        <div
          className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/40 backdrop-blur-sm cursor-pointer hover:border-purple-400/60 transition-all"
          onClick={() => status.kind !== 'public' ? setShowPurchaseModal(true) : null}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-300" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-white mb-1">
                {status.streamTitle || 'Show Starts Soon'}
              </div>
              <div className="text-sm text-white/70">
                {status.startsAt
                  ? `Starting ${new Date(status.startsAt).toLocaleString()}`
                  : 'Starting soon'}
              </div>
            </div>
            {status.kind !== 'public' && (
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/30">
                ${(status.priceCents ?? 0) / 100}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live state - Simple clickable video preview */}
      {status.state === 'live' && (
        <div
          className="relative rounded-2xl overflow-hidden border-2 border-red-500/60 bg-black shadow-2xl shadow-red-500/20 cursor-pointer group"
          onClick={!status.hasAccess && status.kind !== 'public' ? () => setShowPurchaseModal(true) : handleClick}
        >
          {/* Animated border glow effect */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none z-10" style={{
            background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }} />

          {/* Private paywall overlay */}
          {!status.hasAccess && status.kind !== 'public' ? (
            <div className="relative aspect-video">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xl grid place-items-center z-20">
                <div className="text-center space-y-4 p-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/40">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Private Show</h3>
                  <p className="text-white/80 text-sm">
                    Tap to get access
                  </p>
                  <div className="text-3xl font-bold text-white">
                    ${(status.priceCents ?? 0) / 100}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live player preview - clickable to go to full experience */
            <div className="relative aspect-video">
              {inView ? (
                <LivePlayer streamId={status.streamId!} miniOnScroll={false} previewMode />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                  <div className="text-white/40 text-sm">Loading...</div>
                </div>
              )}

              {/* Hover overlay - "Tap to watch" */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center z-20">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                  <span className="text-white font-semibold text-sm">Tap to watch</span>
                </div>
              </div>

              {/* Top overlay - LIVE badge + viewer count */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-600 text-white shadow-lg shadow-red-600/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                  {status.currentViewers !== undefined && status.currentViewers > 0 && (
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-black/60 backdrop-blur-sm text-white flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {status.currentViewers.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom overlay - Stream title */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-30">
                {status.streamTitle && (
                  <h3 className="text-white font-semibold text-sm truncate">{status.streamTitle}</h3>
                )}
                <p className="text-white/70 text-xs">@{username}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Purchase Modal */}
      {showPurchaseModal && status.streamId && (
        <StreamAccessModal
          streamId={status.streamId}
          streamTitle={status.streamTitle || 'Private Stream'}
          creatorName={status.creatorName || username}
          price={(status.priceCents ?? 0) / 100}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={() => {
            setShowPurchaseModal(false);
            // Reload to update access status
          }}
        />
      )}
    </section>
  );
}
