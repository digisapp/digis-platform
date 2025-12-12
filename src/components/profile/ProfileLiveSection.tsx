'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { streamAnalytics } from '@/lib/utils/analytics';
import { useRouter } from 'next/navigation';
import { StreamAccessModal } from '@/components/live/StreamAccessModal';
import { Users, Share2, Gift, Coins, Clock, ChevronRight, Maximize2 } from 'lucide-react';

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
  currentViewers?: number;
};

interface ProfileLiveSectionProps {
  username: string;
}

export default function ProfileLiveSection({ username }: ProfileLiveSectionProps) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [inView, setInView] = useState(true); // Default to true - live streams should load immediately
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

    const optimisticId = `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setOptimisticTips((prev) => [...prev, { id: optimisticId, amount }]);

    // Track analytics
    streamAnalytics.quickTipSent(status.streamId, amount);

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': optimisticId,
        },
        body: JSON.stringify({ amount, streamId: status.streamId }),
      });

      if (!response.ok) {
        // Rollback on failure
        setOptimisticTips((prev) => prev.filter((t) => t.id !== optimisticId));
        const error = await response.json();
        console.error('[ProfileLiveSection] Tip failed:', error);
      }
    } catch (error) {
      // Rollback on error
      setOptimisticTips((prev) => prev.filter((t) => t.id !== optimisticId));
      console.error('[ProfileLiveSection] Tip error:', error);
    }
  };

  const handleWatchFullScreen = () => {
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
        <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/40 backdrop-blur-sm">
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
              <button
                onClick={() => router.push(`/purchase?username=${username}`)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all shadow-lg shadow-purple-500/30"
              >
                Get Ticket · ${(status.priceCents ?? 0) / 100}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live state */}
      {status.state === 'live' && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-red-500/60 bg-black shadow-2xl shadow-red-500/20">
          {/* Animated border glow effect */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }} />

          {/* Private paywall overlay */}
          {!status.hasAccess && status.kind !== 'public' ? (
            <div className="relative aspect-video">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xl grid place-items-center">
                <div className="text-center space-y-4 p-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/40">
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
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all shadow-lg shadow-pink-500/30"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    Buy Access Now
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live player for accessible streams */
            <div className="relative aspect-video">
              {inView ? (
                <LivePlayer streamId={status.streamId!} miniOnScroll />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                  <div className="text-white/40 text-sm">Loading...</div>
                </div>
              )}

              {/* Top overlay - LIVE badge + viewer count */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
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
            </div>
          )}

          {/* Stream info + action bar */}
          <div className="bg-gradient-to-r from-red-600/95 to-pink-600/95 backdrop-blur-sm">
            {/* Stream title */}
            {status.streamTitle && (
              <div className="px-4 pt-3 pb-2 border-b border-white/10">
                <h3 className="text-white font-semibold text-sm truncate">{status.streamTitle}</h3>
              </div>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/90 font-medium">@{username}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Share button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (navigator.share) {
                      navigator.share({
                        title: status.streamTitle || `${username} is live!`,
                        url: `/live/${status.streamId}`,
                      });
                    } else {
                      navigator.clipboard.writeText(`${window.location.origin}/live/${status.streamId}`);
                    }
                  }}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4 text-white" />
                </button>

                {/* Watch Full Screen button */}
                <button
                  onClick={handleWatchFullScreen}
                  className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all text-white text-sm font-semibold flex items-center gap-1.5 group"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Full Screen</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick chat and tips (only if user has access) */}
          {status.hasAccess && (
            <div className="border-t border-white/10 p-4 space-y-3 bg-gradient-to-b from-black/60 to-black/40">
              {/* Quick tip buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleWatchFullScreen}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold text-sm hover:scale-105 transition-all shadow-md shadow-pink-500/30 flex items-center gap-1.5"
                >
                  <Gift className="w-4 h-4" />
                  Send Gift
                </button>
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-digis-cyan to-digis-pink text-white font-semibold text-sm hover:scale-105 transition-all shadow-md shadow-digis-pink/30 flex items-center gap-1"
                    onClick={() => handleQuickTip(amount)}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    {amount}
                  </button>
                ))}
              </div>

              {/* Quick chat */}
              <QuickChat streamId={status.streamId!} compact maxMessages={10} />
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
