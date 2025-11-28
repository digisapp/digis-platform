'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { TicketPurchaseModal } from '@/components/shows/TicketPurchaseModal';

interface Show {
  id: string;
  title: string;
  description: string | null;
  showType: string;
  ticketPrice: number;
  maxTickets: number | null;
  ticketsSold: number;
  scheduledStart: string;
  durationMinutes: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  coverImageUrl: string | null;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

const showTypeLabels: Record<string, string> = {
  performance: 'Performance',
  class: 'Class',
  qna: 'Q&A',
  hangout: 'Hangout',
  gaming: 'Gaming',
  workshop: 'Workshop',
  other: 'Other',
};

const showTypeEmojis: Record<string, string> = {
  performance: '🎭',
  class: '🧘',
  qna: '💬',
  hangout: '💕',
  gaming: '🎮',
  workshop: '🎓',
  other: '🎪',
};

export default function StreamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const showId = params?.showId as string;

  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<Show | null>(null);
  const [hasTicket, setHasTicket] = useState(false);
  const [error, setError] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (showId) {
      checkAuth();
      fetchShow();
    }
  }, [showId]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  const fetchShow = async () => {
    try {
      const response = await fetch(`/api/shows/${showId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stream');
      }

      setShow(data.show);
      setHasTicket(data.hasTicket || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSuccess = () => {
    setShowPurchaseModal(false);
    fetchShow(); // Refresh to update ticket status
  };

  const handleJoinStream = async () => {
    if (!hasTicket) {
      setShowPurchaseModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/shows/${showId}/join`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join stream');
      }

      // Redirect to viewer page
      if (data.roomName) {
        router.push(`/stream/${data.roomName}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join stream');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Stream Not Found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <GlassButton
            variant="gradient"
            onClick={() => router.push('/streams')}
          >
            Browse Streams
          </GlassButton>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(show.scheduledStart);
  const isSoldOut = show.maxTickets !== null && show.ticketsSold >= show.maxTickets;
  const isPast = scheduledDate < new Date();
  const canPurchase = show.status === 'scheduled' && !isSoldOut && !hasTicket;
  const canJoin = show.status === 'live' && hasTicket;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/streams')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <span className="text-xl">←</span>
          <span>Back to Streams</span>
        </button>

        <div className="max-w-4xl mx-auto">
          {/* Cover Image */}
          {show.coverImageUrl && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-6 border-2 border-white/10">
              <img
                src={show.coverImageUrl}
                alt={show.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{showTypeEmojis[show.showType]}</span>
              <span className="text-sm font-medium text-digis-cyan">
                {showTypeLabels[show.showType]}
              </span>
              {show.status === 'live' && (
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  🔴 LIVE NOW
                </span>
              )}
              {isSoldOut && show.status === 'scheduled' && (
                <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                  🎫 SOLD OUT
                </span>
              )}
            </div>

            <h1 className="text-4xl font-bold text-white mb-4">{show.title}</h1>

            {/* Creator */}
            <div
              onClick={() => router.push(`/${show.creator.username}`)}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity w-fit"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink overflow-hidden">
                {show.creator.avatarUrl ? (
                  <img
                    src={show.creator.avatarUrl}
                    alt={show.creator.displayName || show.creator.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                    {(show.creator.displayName || show.creator.username)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-400">Hosted by</div>
                <div className="font-semibold text-white">
                  {show.creator.displayName || show.creator.username}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Details */}
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              {show.description && (
                <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-bold text-white mb-3">About This Stream</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{show.description}</p>
                </div>
              )}

              {/* Details */}
              <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-4">Event Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <div className="text-sm text-gray-400">Date</div>
                      <div className="text-white font-medium">
                        {format(scheduledDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <div className="text-sm text-gray-400">Time</div>
                      <div className="text-white font-medium">
                        {format(scheduledDate, 'h:mm a')}
                        {!isPast && ` (${formatDistanceToNow(scheduledDate, { addSuffix: true })})`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⏱️</span>
                    <div>
                      <div className="text-sm text-gray-400">Duration</div>
                      <div className="text-white font-medium">{show.durationMinutes} minutes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Ticket Info */}
            <div className="space-y-4">
              {/* Ticket Card */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl border-2 border-purple-500/50 p-6 sticky top-4">
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-300 mb-2">Ticket Price</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-yellow-400">{show.ticketPrice}</span>
                    <span className="text-gray-400">coins</span>
                  </div>
                </div>

                {/* Tickets Sold */}
                <div className="mb-4 p-3 bg-black/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">Tickets Sold</span>
                    <span className="text-white font-medium">
                      {show.ticketsSold}
                      {show.maxTickets && ` / ${show.maxTickets}`}
                    </span>
                  </div>
                  {show.maxTickets && (
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-digis-cyan to-digis-pink h-full transition-all"
                        style={{
                          width: `${Math.min((show.ticketsSold / show.maxTickets) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {hasTicket ? (
                  <div className="space-y-3">
                    <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
                      <div className="text-green-300 text-sm font-medium">
                        ✓ You have a ticket!
                      </div>
                    </div>
                    {canJoin && (
                      <GlassButton
                        variant="gradient"
                        size="lg"
                        onClick={handleJoinStream}
                        className="w-full"
                        shimmer
                        glow
                      >
                        <span className="text-xl mr-2">🎥</span>
                        Join Stream Now
                      </GlassButton>
                    )}
                    {show.status === 'scheduled' && (
                      <div className="text-center text-sm text-gray-400">
                        Stream starts {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                      </div>
                    )}
                  </div>
                ) : canPurchase ? (
                  <GlassButton
                    variant="gradient"
                    size="lg"
                    onClick={() => isAuthenticated ? setShowPurchaseModal(true) : router.push('/')}
                    className="w-full"
                    shimmer
                    glow
                  >
                    <span className="text-xl mr-2">🎫</span>
                    {isAuthenticated ? 'Buy Ticket' : 'Login to Buy Ticket'}
                  </GlassButton>
                ) : isSoldOut ? (
                  <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-center">
                    <div className="text-yellow-300 font-bold mb-1">Sold Out</div>
                    <div className="text-xs text-gray-400">No tickets available</div>
                  </div>
                ) : show.status === 'ended' ? (
                  <div className="bg-gray-500/20 border border-gray-500 rounded-lg p-4 text-center">
                    <div className="text-gray-300 font-bold">Stream Ended</div>
                  </div>
                ) : show.status === 'cancelled' ? (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-center">
                    <div className="text-red-300 font-bold">Stream Cancelled</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && show && (
        <TicketPurchaseModal
          show={show}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
