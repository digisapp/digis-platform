'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ShowCard } from '@/components/shows/ShowCard';
import { Calendar, Ticket, Users, Radio, Sparkles, Dumbbell, User, Theater } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-cyan-50 md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 backdrop-blur-xl border border-white/40">
              <Ticket className="w-8 h-8 text-digis-cyan" strokeWidth={2.5} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink">
              Community Events
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Join fitness classes, workshops, and exclusive events from creators in the community</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === 'upcoming'
                  ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Calendar className="w-4 h-4" strokeWidth={2.5} />
              Upcoming
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === 'live'
                  ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Radio className="w-4 h-4 text-red-500" strokeWidth={2.5} />
              Live Now
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Sparkles className="w-4 h-4" strokeWidth={2.5} />
              All Events
            </button>
          </div>

          {/* Event Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                typeFilter === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Ticket className="w-4 h-4" strokeWidth={2.5} />
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('workshop')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                typeFilter === 'workshop'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Dumbbell className="w-4 h-4" strokeWidth={2.5} />
              Workshops
            </button>
            <button
              onClick={() => setTypeFilter('meetgreet')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                typeFilter === 'meetgreet'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Users className="w-4 h-4" strokeWidth={2.5} />
              Meet & Greet
            </button>
            <button
              onClick={() => setTypeFilter('performance')}
              className={`px-5 py-3 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                typeFilter === 'performance'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-gray-900 shadow-lg scale-105'
                  : 'bg-white/40 backdrop-blur-xl border border-white/60 text-gray-700 hover:bg-white/60 hover:scale-105'
              }`}
            >
              <Theater className="w-4 h-4" strokeWidth={2.5} />
              Performances
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
          <div className="relative overflow-hidden rounded-3xl p-12 text-center bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/5 via-digis-purple/5 to-digis-pink/5" />
            <div className="relative">
              <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 mb-6">
                <Calendar className="w-16 h-16 text-digis-purple" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">No Upcoming Events</h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">Check back soon for new community events!</p>
              <button
                onClick={() => router.push('/explore')}
                className="px-8 py-4 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-xl font-bold hover:scale-105 transition-all shadow-2xl"
              >
                Explore Creators
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
