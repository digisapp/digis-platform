'use client';

import { Lock, UserPlus, CreditCard, Ticket, Coins } from 'lucide-react';

interface AccessDeniedData {
  reason: string;
  creatorId?: string;
  creatorUsername?: string;
  requiresSubscription?: boolean;
  requiresFollow?: boolean;
  requiresTicket?: boolean;
  ticketPrice?: number;
  subscriptionPrice?: number;
}

interface AccessDeniedScreenProps {
  accessDenied: AccessDeniedData;
  onRetryAccess: () => void;
  onNavigate: (path: string) => void;
}

export function AccessDeniedScreen({
  accessDenied,
  onRetryAccess,
  onNavigate,
}: AccessDeniedScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 p-4 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 inline-block">
          <Lock className="w-12 h-12 text-pink-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">
          This Stream is Private
        </h1>
        <p className="text-gray-400 mb-4">
          {accessDenied.requiresSubscription
            ? 'You must be an active subscriber to watch this stream.'
            : accessDenied.requiresFollow
              ? 'You must be following this creator to watch this stream.'
              : accessDenied.requiresTicket
                ? 'This is a ticketed show. Purchase a ticket to watch.'
                : accessDenied.reason}
        </p>

        {/* Action buttons based on what's required */}
        <div className="space-y-3">
          {accessDenied.requiresFollow && accessDenied.creatorUsername && (
            <button
              onClick={() => onNavigate(`/${accessDenied.creatorUsername}`)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-purple text-white rounded-xl font-semibold hover:scale-105 transition-all"
            >
              <UserPlus className="w-5 h-5" />
              Follow @{accessDenied.creatorUsername}
            </button>
          )}

          {accessDenied.requiresSubscription && accessDenied.creatorUsername && (
            <button
              onClick={() => onNavigate(`/${accessDenied.creatorUsername}`)}
              className="w-full flex flex-col items-center justify-center gap-1 px-6 py-3 bg-gradient-to-r from-digis-purple to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-all"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscribe to @{accessDenied.creatorUsername}
              </div>
              {accessDenied.subscriptionPrice && (
                <span className="text-sm opacity-90 flex items-center gap-1">
                  <Coins className="w-4 h-4" /> {accessDenied.subscriptionPrice} coins/month
                </span>
              )}
            </button>
          )}

          {accessDenied.requiresTicket && accessDenied.creatorUsername && (
            <button
              onClick={() => onNavigate(`/${accessDenied.creatorUsername}`)}
              className="w-full flex flex-col items-center justify-center gap-1 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-gray-900 rounded-xl font-semibold hover:scale-105 transition-all"
            >
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Buy Ticket
              </div>
              {accessDenied.ticketPrice && (
                <span className="text-sm opacity-90 flex items-center gap-1">
                  <Coins className="w-4 h-4" /> {accessDenied.ticketPrice} coins
                </span>
              )}
            </button>
          )}

          {/* Already subscribed? Retry access check */}
          {(accessDenied.requiresSubscription || accessDenied.requiresTicket) && (
            <button
              onClick={onRetryAccess}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-xl font-medium transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Already Subscribed? Try Again
            </button>
          )}

          {/* Visit creator profile if username available */}
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
            onClick={() => onNavigate('/watch')}
            className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Browse Other Streams
          </button>
        </div>
      </div>
    </div>
  );
}
