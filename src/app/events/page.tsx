'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ShowCard } from '@/components/shows/ShowCard';
import { Calendar, Ticket, Users, Radio, Sparkles, Dumbbell, User, Theater, Search, X } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');

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

    // Search filter
    let searchMatch = true;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const title = (show.title || '').toLowerCase();
      const description = (show.description || '').toLowerCase();
      const creatorName = (show.creator.displayName || show.creator.username || '').toLowerCase();

      searchMatch = title.includes(query) || description.includes(query) || creatorName.includes(query);
    }

    return statusMatch && typeMatch && searchMatch;
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
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-12 pr-12 py-3 bg-white/60 backdrop-blur-xl border border-purple-200 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          {/* Status Filter Pills */}
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'upcoming'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
            Upcoming
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'live'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${filter === 'live' ? '' : 'text-red-500'}`} strokeWidth={2} />
            Live Now
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-300 self-center mx-1" />

          {/* Event Type Filter Pills */}
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" strokeWidth={2} />
            All Types
          </button>
          <button
            onClick={() => setTypeFilter('workshop')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              typeFilter === 'workshop'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" strokeWidth={2} />
            Workshops
          </button>
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
              <h3 className="text-2xl font-black text-gray-900">No Upcoming Events</h3>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
