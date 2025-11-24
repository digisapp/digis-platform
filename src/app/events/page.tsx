'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { ShowCard } from '@/components/shows/ShowCard';
import { Calendar, Ticket, Users, Radio, Sparkles, Dumbbell, User, Theater, Search, X } from 'lucide-react';

type ShowType = 'performance' | 'class' | 'qna' | 'gaming' | 'workshop' | 'other';

interface Show {
  id: string;
  title: string;
  description: string | null;
  showType: ShowType;
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
  const [typeFilter, setTypeFilter] = useState<ShowType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categoryOptions = [
    { value: 'all' as const, label: 'All', icon: '📋' },
    { value: 'performance' as const, label: 'Performance', icon: '🎭' },
    { value: 'class' as const, label: 'Class', icon: '🧘' },
    { value: 'qna' as const, label: 'Q&A', icon: '💬' },
    { value: 'gaming' as const, label: 'Gaming', icon: '🎮' },
    { value: 'workshop' as const, label: 'Workshop', icon: '🎓' },
    { value: 'other' as const, label: 'Other', icon: '🎪' },
  ];

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header with Logo */}
      <MobileHeader />

      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shows..."
            className="w-full pl-12 pr-12 py-3 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-400 hover:text-cyan-300"
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
            className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 ${
              filter === 'upcoming'
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30 hover:border-digis-cyan hover:bg-white hover:scale-105'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
            Upcoming
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 ${
              filter === 'live'
                ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30 hover:border-digis-cyan hover:bg-white hover:scale-105'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${filter === 'live' ? '' : 'text-red-500'}`} strokeWidth={2} />
            Live Now
          </button>

          {/* Category Filter Pills */}
          {categoryOptions.map((category) => (
            <button
              key={category.value}
              onClick={() => setTypeFilter(category.value)}
              className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 flex items-center gap-1.5 ${
                typeFilter === category.value
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-cyan-500/30 hover:border-digis-cyan hover:bg-white hover:scale-105'
              }`}
            >
              <span>{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Live Events */}
        {liveEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-4 flex items-center gap-2">
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-4">
              {filter === 'upcoming' ? 'Upcoming Events' : 'Scheduled'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((show) => (
                <ShowCard key={show.id} show={show} />
              ))}
            </div>
          </div>
        ) : filter === 'upcoming' && liveEvents.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl p-12 text-center backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/5 via-digis-purple/5 to-digis-pink/5" />
            <div className="relative">
              <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 mb-6">
                <Calendar className="w-16 h-16 text-cyan-400" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">No Upcoming Events</h3>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
