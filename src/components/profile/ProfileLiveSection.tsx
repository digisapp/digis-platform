'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { streamAnalytics } from '@/lib/utils/analytics';
import { useRouter } from 'next/navigation';
import { StreamAccessModal } from '@/components/live/StreamAccessModal';

const LivePlayer = dynamic(() => import('@/components/live/LivePlayer'), { ssr: false });
const QuickChat = dynamic(() => import('@/components/live/QuickChat'), { ssr: false });

type Status = {
  state: 'live' | 'upcoming' | 'ended' | 'idle';
  streamId?: string;
  kind?: string;
  priceCents?: number;
  hasAccess?: boolean;
  startsAt?: string | null;
  streamTitle?: string;
  creatorName?: string;
};

interface ProfileLiveSectionProps {
  username: string;
}

export default function ProfileLiveSection({ username }: ProfileLiveSectionProps) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [inView, setInView] = useState(false);
  const [optimisticTips, setOptimisticTips] = useState<Array<{ id: string; amount: number }>>([]);
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
          retryDelay = 1200; // Reset delay on success
        }
      } catch (error) {
        console.error('[ProfileLiveSection] Load error:', error);
        if (retries > 0 && alive) {
          setTimeout(() => alive && load(retries - 1), retryDelay);
          retryDelay *= 2; // Exponential backoff
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

  // Optimistic tip handler
  const handleQuickTip = async (amount: number) => {
    if (!status.streamId) return;

    const optimisticId = `tip-${Date.now()}`;
    setOptimisticTips((prev) => [...prev, { id: optimisticId, amount }]);

    // Track analytics
    streamAnalytics.quickTipSent(status.streamId, amount);

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, streamId: status.streamId }),
      });

      if (!response.ok) {
        // Rollback on failure
        setOptimisticTips((prev) => prev.filter((t) => t.id !== optimisticId));
      }
    } catch (error) {
      // Rollback on error
      setOptimisticTips((prev) => prev.filter((t) => t.id !== optimisticId));
      console.error('[ProfileLiveSection] Tip error:', error);
    }
  };

  const handleTheaterMode = () => {
    if (status.streamId) {
      router.prefetch(`/live/${status.streamId}`);
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
        <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold text-gray-900 mb-1">Show Starts Soon</div>
              <div className="text-sm text-gray-600">
                {status.startsAt
                  ? `Starting ${new Date(status.startsAt).toLocaleString()}`
                  : 'Starting soon'}
              </div>
            </div>
            {status.kind !== 'public' && (
              <button
                onClick={() => router.push(`/purchase?username=${username}`)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all"
              >
                Get Ticket · ${(status.priceCents ?? 0) / 100}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live state */}
      {status.state === 'live' && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-red-400/50 bg-black shadow-2xl">
          {/* Private paywall overlay */}
          {!status.hasAccess && status.kind !== 'public' ? (
            <div className="relative aspect-video">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xl grid place-items-center">
                <div className="text-center space-y-4 p-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Private Show</h3>
                  <p className="text-white/80 text-sm">
                    This is an exclusive private stream
                  </p>
                  <div className="text-3xl font-bold text-white">
                    ${(status.priceCents ?? 0) / 100}
                  </div>
                  <button
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all shadow-lg"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    Buy Access Now
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live player for accessible streams */
            <div className="aspect-video">
              {inView ? (
                <LivePlayer streamId={status.streamId!} miniOnScroll />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                  <div className="text-white/40 text-sm">Loading...</div>
                </div>
              )}
            </div>
          )}

          {/* Control bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-500/10 to-pink-500/10 border-t border-white/10">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-600 text-white animate-pulse">
                ● LIVE
              </span>
              <span className="text-sm text-gray-700 font-medium">{username}</span>
            </div>
            <button
              className="text-sm font-semibold text-digis-cyan hover:text-digis-pink transition-colors underline"
              onMouseEnter={() => router.prefetch(`/live/${status.streamId}`)}
              onClick={handleTheaterMode}
            >
              Theater Mode →
            </button>
          </div>

          {/* Quick chat and tips (only if user has access) */}
          {status.hasAccess && (
            <div className="border-t border-white/10 p-4 space-y-3 bg-gradient-to-b from-black/40 to-black/20">
              {/* Quick tip buttons */}
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 25, 50].map((amount) => (
                  <button
                    key={amount}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-digis-cyan to-digis-pink text-white font-semibold text-sm hover:scale-105 transition-all shadow-md shadow-digis-pink/30"
                    onClick={() => handleQuickTip(amount)}
                  >
                    {amount} coins
                  </button>
                ))}
              </div>

              {/* Quick chat */}
              <QuickChat streamId={status.streamId!} compact maxMessages={10} />
            </div>
          )}
        </div>
      )}

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
