'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ShowCard } from '@/components/shows/ShowCard';
import { Calendar, Filter, TrendingUp } from 'lucide-react';

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

export default function EventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState<Show[]>([]);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('upcoming');
  const [typeFilter, setTypeFilter] = useState<'all' | 'workshop' | 'meetgreet' | 'performance'>('all');

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
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredShows = shows.filter((show) => {
    // Status filter
    let statusMatch = true;
    if (filter === 'live') statusMatch = show.status === 'live';
    if (filter === 'upcoming') statusMatch = show.status === 'scheduled';
    if (filter === 'all') statusMatch = show.status === 'live' || show.status === 'scheduled';

    // Type filter
    let typeMatch = true;
    if (typeFilter !== 'all') typeMatch = show.showType === typeFilter;

    return statusMatch && typeMatch;
  });

  const sortedShows = [...filteredShows].sort((a, b) => {
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
  });

  // Separate live and upcoming events
  const liveEvents = sortedShows.filter(s => s.status === 'live');
  const upcomingEvents = sortedShows.filter(s => s.status === 'scheduled');

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Community Events 🎟️</h1>
          <p className="text-gray-700">Join fitness classes, workshops, and exclusive events from creators in the community</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === 'upcoming'
                  ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Upcoming
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === 'live'
                  ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              🔴 Live Now
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              All Events
            </button>
          </div>

          {/* Event Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                typeFilter === 'all'
                  ? 'bg-purple-500 text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('workshop')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                typeFilter === 'workshop'
                  ? 'bg-purple-500 text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              🏋️ Workshops
            </button>
            <button
              onClick={() => setTypeFilter('meetgreet')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                typeFilter === 'meetgreet'
                  ? 'bg-purple-500 text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              👋 Meet & Greet
            </button>
            <button
              onClick={() => setTypeFilter('performance')}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                typeFilter === 'performance'
                  ? 'bg-purple-500 text-gray-900'
                  : 'glass text-gray-700 hover:bg-white/60'
              }`}
            >
              🎭 Performances
            </button>
          </div>
        </div>

        {/* Live Events */}
        {liveEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Live Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveEvents.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {filter === 'upcoming' ? 'Upcoming Events' : 'Scheduled'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </div>
        ) : filter === 'upcoming' && liveEvents.length === 0 ? (
          <div className="glass rounded-xl border-2 border-purple-200 p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Events</h3>
            <p className="text-gray-700 mb-6">Check back soon for new community events!</p>
            <button
              onClick={() => router.push('/explore')}
              className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Explore Creators
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
