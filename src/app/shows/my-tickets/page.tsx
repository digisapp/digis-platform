'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';

interface Ticket {
  id: string;
  ticketNumber: number;
  coinsPaid: number;
  purchasedAt: string;
  checkInTime: string | null;
  show: {
    id: string;
    title: string;
    showType: string;
    scheduledStart: string;
    durationMinutes: number;
    status: 'scheduled' | 'live' | 'ended' | 'cancelled';
    coverImageUrl: string | null;
    roomName: string | null;
    creator: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  };
}

const showTypeEmojis: Record<string, string> = {
  live_show: '🎥',
  qna: '❓',
  workshop: '🎓',
  meetgreet: '👋',
  performance: '🎭',
};

export default function MyTicketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    checkAuth();
    fetchTickets();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/shows/my-tickets');
      const data = await response.json();

      if (response.ok) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinShow = async (ticket: Ticket) => {
    try {
      const response = await fetch(`/api/shows/${ticket.show.id}/join`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join show');
      }

      // Redirect to viewer page
      if (data.roomName) {
        router.push(`/stream/${data.roomName}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join show');
    }
  };

  const upcomingTickets = tickets.filter(
    (t) => t.show.status === 'scheduled' || t.show.status === 'live'
  );

  const pastTickets = tickets.filter(
    (t) => t.show.status === 'ended' || t.show.status === 'cancelled'
  );

  const displayTickets = filter === 'upcoming' ? upcomingTickets : pastTickets;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Tickets 🎫</h1>
          <p className="text-gray-400">View and manage your show tickets</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">🎟️</div>
            <div className="text-2xl font-bold text-white mb-1">{tickets.length}</div>
            <div className="text-xs text-gray-400">Total Tickets</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-2xl font-bold text-digis-cyan mb-1">{upcomingTickets.length}</div>
            <div className="text-xs text-gray-400">Upcoming</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-400 mb-1">
              {tickets.filter((t) => t.checkInTime).length}
            </div>
            <div className="text-xs text-gray-400">Attended</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {tickets.reduce((sum, t) => sum + t.coinsPaid, 0)}
            </div>
            <div className="text-xs text-gray-400">Coins Spent</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'upcoming'
                ? 'bg-digis-cyan text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Upcoming ({upcomingTickets.length})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'past'
                ? 'bg-gray-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Past ({pastTickets.length})
          </button>
        </div>

        {/* Tickets List */}
        {displayTickets.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'upcoming' ? 'No upcoming shows' : 'No past shows'}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'upcoming'
                ? 'Purchase tickets to exclusive shows and events'
                : 'Your attended shows will appear here'}
            </p>
            {filter === 'upcoming' && (
              <GlassButton
                variant="gradient"
                size="md"
                onClick={() => router.push('/shows')}
                shimmer
              >
                Browse Shows
              </GlassButton>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayTickets.map((ticket) => {
              const scheduledDate = new Date(ticket.show.scheduledStart);
              const isLive = ticket.show.status === 'live';
              const canJoin = isLive;

              return (
                <div
                  key={ticket.id}
                  className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden hover:border-digis-cyan/50 transition-all"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Cover Image */}
                    <div className="md:w-64 aspect-video md:aspect-square bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 flex-shrink-0">
                      {ticket.show.coverImageUrl ? (
                        <img
                          src={ticket.show.coverImageUrl}
                          alt={ticket.show.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          {showTypeEmojis[ticket.show.showType]}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          {/* Status Badge */}
                          {isLive && (
                            <span className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full mb-2 animate-pulse">
                              🔴 LIVE NOW
                            </span>
                          )}
                          {ticket.show.status === 'cancelled' && (
                            <span className="inline-block px-3 py-1 bg-orange-500/20 border border-orange-500 text-orange-300 text-xs font-bold rounded-full mb-2">
                              CANCELLED
                            </span>
                          )}

                          <h3
                            onClick={() => router.push(`/shows/${ticket.show.id}`)}
                            className="text-xl font-bold text-white mb-2 cursor-pointer hover:text-digis-cyan transition-colors"
                          >
                            {ticket.show.title}
                          </h3>

                          {/* Creator */}
                          <div
                            onClick={() => router.push(`/profile/${ticket.show.creator.username}`)}
                            className="flex items-center gap-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity w-fit"
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink overflow-hidden">
                              {ticket.show.creator.avatarUrl ? (
                                <img
                                  src={ticket.show.creator.avatarUrl}
                                  alt={ticket.show.creator.displayName || ticket.show.creator.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold">
                                  {(ticket.show.creator.displayName || ticket.show.creator.username)[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-400">
                              {ticket.show.creator.displayName || ticket.show.creator.username}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                            <div className="flex items-center gap-1">
                              <span>📅</span>
                              <span>{format(scheduledDate, 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>⏰</span>
                              <span>{format(scheduledDate, 'h:mm a')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>🎫</span>
                              <span>Ticket #{ticket.ticketNumber}</span>
                            </div>
                          </div>

                          {/* Check-in status */}
                          {ticket.checkInTime && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500 rounded-full text-xs text-green-300">
                              <span>✓</span>
                              <span>Attended</span>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="ml-4">
                          {canJoin && (
                            <GlassButton
                              variant="gradient"
                              size="md"
                              onClick={() => handleJoinShow(ticket)}
                              shimmer
                              glow
                            >
                              <span className="text-xl mr-2">🎥</span>
                              Join Now
                            </GlassButton>
                          )}
                          {ticket.show.status === 'scheduled' && !isLive && (
                            <div className="text-sm text-gray-400 text-right">
                              Starts {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
