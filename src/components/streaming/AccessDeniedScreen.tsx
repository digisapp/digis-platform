'use client';

import { useState } from 'react';
import { Lock, UserPlus, CreditCard, Ticket, Coins, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface AccessDeniedData {
  reason: string;
  creatorId?: string;
  creatorUsername?: string;
  requiresSubscription?: boolean;
  requiresFollow?: boolean;
  requiresTicket?: boolean;
  ticketPrice?: number;
  subscriptionPrice?: number;
  streamId?: string;
}

interface AccessDeniedScreenProps {
  accessDenied: AccessDeniedData;
  onRetryAccess: () => void;
  onNavigate: (_path: string) => void;
}

export function AccessDeniedScreen({
  accessDenied,
  onRetryAccess,
  onNavigate,
}: AccessDeniedScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async () => {
    if (!accessDenied.creatorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: accessDenied.creatorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.insufficientBalance) {
          setError(data.error || 'Not enough coins. Please add more coins to subscribe.');
        } else if (data.error?.includes('Already subscribed')) {
          // Already subscribed — just retry access
          setSuccess(true);
          setTimeout(() => onRetryAccess(), 500);
          return;
        } else {
          setError(data.error || 'Failed to subscribe');
        }
        return;
      }
      setSuccess(true);
      // Auto-retry access after successful subscribe
      setTimeout(() => onRetryAccess(), 800);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!accessDenied.creatorId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/follow/${accessDenied.creatorId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to follow');
        return;
      }
      setSuccess(true);
      setTimeout(() => onRetryAccess(), 800);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTicket = async () => {
    if (!accessDenied.streamId) {
      // Fallback to profile if no streamId
      if (accessDenied.creatorUsername) {
        onNavigate(`/${accessDenied.creatorUsername}`);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/streams/${accessDenied.streamId}/ticket`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes('insufficient') || data.error?.includes('enough coins')) {
          setError(data.error || 'Not enough coins. Please add more coins.');
        } else {
          setError(data.error || 'Failed to buy ticket');
        }
        return;
      }
      setSuccess(true);
      setTimeout(() => onRetryAccess(), 800);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 inline-block">
          {success ? (
            <CheckCircle className="w-12 h-12 text-green-400" />
          ) : (
            <Lock className="w-12 h-12 text-pink-400" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">
          {success ? 'Access Granted!' : 'This Stream is Private'}
        </h1>
        <p className="text-gray-400 mb-4">
          {success
            ? 'Joining stream now...'
            : accessDenied.requiresSubscription
              ? 'You must be an active subscriber to watch this stream.'
              : accessDenied.requiresFollow
                ? 'You must be following this creator to watch this stream.'
                : accessDenied.requiresTicket
                  ? 'This is a ticketed show. Purchase a ticket to watch.'
                  : accessDenied.reason}
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!success && (
          <div className="space-y-3">
            {/* Follow — inline action */}
            {accessDenied.requiresFollow && accessDenied.creatorId && (
              <button
                onClick={handleFollow}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-purple text-white rounded-xl font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                {loading ? 'Following...' : `Follow @${accessDenied.creatorUsername || 'Creator'}`}
              </button>
            )}

            {/* Subscribe — inline action */}
            {accessDenied.requiresSubscription && accessDenied.creatorId && (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full flex flex-col items-center justify-center gap-1 px-6 py-3 bg-gradient-to-r from-digis-purple to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CreditCard className="w-5 h-5" />
                  )}
                  {loading ? 'Subscribing...' : `Subscribe to @${accessDenied.creatorUsername || 'Creator'}`}
                </div>
                {!loading && accessDenied.subscriptionPrice && (
                  <span className="text-sm opacity-90 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> {accessDenied.subscriptionPrice} coins/month
                  </span>
                )}
              </button>
            )}

            {/* Buy Ticket — inline action */}
            {accessDenied.requiresTicket && (
              <button
                onClick={handleBuyTicket}
                disabled={loading}
                className="w-full flex flex-col items-center justify-center gap-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded-xl font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="flex items-center gap-2">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Ticket className="w-5 h-5" />
                  )}
                  {loading ? 'Purchasing...' : 'Buy Ticket'}
                </div>
                {!loading && accessDenied.ticketPrice && (
                  <span className="text-sm opacity-90 flex items-center gap-1">
                    <Coins className="w-4 h-4" /> {accessDenied.ticketPrice} coins
                  </span>
                )}
              </button>
            )}

            {/* Visit creator profile */}
            {accessDenied.creatorUsername && (
              <button
                onClick={() => onNavigate(`/${accessDenied.creatorUsername}`)}
                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
              >
                Visit Creator Profile
              </button>
            )}

            {/* Browse other streams */}
            <button
              onClick={() => onNavigate('/streams')}
              className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Browse Other Streams
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
