'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ShowCard } from '@/components/shows/ShowCard';

interface Show {
  id: string;
  title: string;
  description: string | null;
  showType: 'live_show' | 'qna' | 'workshop' | 'meetgreet' | 'performance';
  ticketPrice: number;
  maxTickets: number | null;
  ticketsSold: number;
  scheduledStart: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  coverImageUrl: string | null;
  totalRevenue: number;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function ShowsDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState<Show[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'popularity'>('date');

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    try {
      const response = await fetch('/api/shows/upcoming');
      const data = await response.json();

      if (response.ok) {
        setShows(data.shows || []);
      }
    } catch (err) {
      console.error('Error fetching shows:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredShows = shows.filter((show) => {
    if (filter === 'live') return show.status === 'live';
    if (filter === 'upcoming') return show.status === 'scheduled';
    return show.status === 'live' || show.status === 'scheduled';
  });

  const sortedShows = [...filteredShows].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
    }
    if (sortBy === 'price') {
      return a.ticketPrice - b.ticketPrice;
    }
    if (sortBy === 'popularity') {
      return b.ticketsSold - a.ticketsSold;
    }
    return 0;
  });

  // Separate live and upcoming shows
  const liveShows = sortedShows.filter(s => s.status === 'live');
  const upcomingShows = sortedShows.filter(s => s.status === 'scheduled');

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient">
      <div className="container mx-auto px-4 pt-4 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ticketed Shows 🎟️</h1>
          <p className="text-gray-700">Discover exclusive live events from your favorite creators</p>
        </div>

        {/* Filters & Sort */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-digis-cyan text-black'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              }`}
            >
              All Shows
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === 'live'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              }`}
            >
              <span className={filter === 'live' ? 'animate-pulse' : ''}>🔴</span>
              Live Now
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === 'upcoming'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/50 text-gray-700 hover:bg-white/70'
              }`}
            >
              📅 Upcoming
            </button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-white/50 border border-purple-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-digis-cyan"
            >
              <option value="date">Date</option>
              <option value="price">Price</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>
        </div>

        {/* Live Shows Section */}
        {liveShows.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <h2 className="text-2xl font-bold text-gray-900">Live Now</h2>
              </div>
              <span className="text-sm text-gray-700">({liveShows.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveShows.map((show) => (
                <ShowCard
                  key={show.id}
                  show={show}
                  isCreator={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Shows Section */}
        {upcomingShows.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upcoming Shows</h2>
              <span className="text-sm text-gray-700">({upcomingShows.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingShows.map((show) => (
                <ShowCard
                  key={show.id}
                  show={show}
                  isCreator={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sortedShows.length === 0 && (
          <div className="glass rounded-2xl border border-purple-200 p-12 text-center">
            <div className="text-6xl mb-4">🎟️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === 'live'
                ? 'No live shows right now'
                : filter === 'upcoming'
                ? 'No upcoming shows'
                : 'No shows available'}
            </h3>
            <p className="text-gray-700 mb-6">
              {filter === 'live'
                ? 'Check back soon for live events!'
                : filter === 'upcoming'
                ? 'New shows are being added regularly. Check back soon!'
                : 'Be the first to know when creators schedule new shows!'}
            </p>
            <button
              onClick={() => router.push('/explore')}
              className="px-6 py-3 bg-digis-cyan text-black rounded-lg font-medium hover:scale-105 transition-transform"
            >
              Explore Creators
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-12 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-2xl border border-purple-500/30 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">About Ticketed Shows</h3>
          <div className="space-y-2 text-sm text-gray-800">
            <p>
              • Purchase tickets with coins to attend exclusive live events
            </p>
            <p>
              • Join Q&A sessions, workshops, performances, and meet & greets
            </p>
            <p>
              • Support your favorite creators directly
            </p>
            <p>
              • Get notified before shows start
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
