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
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my-tickets'>('all');
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'popularity'>('date');

  useEffect(() => {
    fetchShows();
    if (activeTab === 'my-tickets') {
      fetchMyTickets();
    }
  }, [activeTab]);

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

  const fetchMyTickets = async () => {
    try {
      const response = await fetch('/api/shows/my-tickets');
      const data = await response.json();

      if (response.ok && data.data) {
        setMyTickets(data.data || []);
      } else {
        setMyTickets([]);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setMyTickets([]);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 md:pl-20 relative overflow-hidden">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-48 -left-48 bg-yellow-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] top-1/3 -right-48 bg-orange-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
            Exclusive Events
          </h1>
          <p className="text-gray-400 text-lg">Premium ticketed shows from top creators</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`group relative px-8 py-4 rounded-2xl font-bold text-base transition-all ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/50 scale-105'
                : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-yellow-500/50 hover:scale-105'
            }`}
          >
            {activeTab === 'all' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
            <span className="relative z-10">All Shows</span>
          </button>
          <button
            onClick={() => setActiveTab('my-tickets')}
            className={`group relative px-8 py-4 rounded-2xl font-bold text-base transition-all ${
              activeTab === 'my-tickets'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-purple-500/50 hover:scale-105'
            }`}
          >
            {activeTab === 'my-tickets' && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
            <span className="relative z-10">My Tickets</span>
          </button>
        </div>

        {/* Filters & Sort - Only show on All Shows tab */}
        {activeTab === 'all' && (
          <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-yellow-500/50 hover:scale-105'
              }`}
            >
              {filter === 'all' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <span className="relative z-10">All Shows</span>
            </button>
            <button
              onClick={() => setFilter('live')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                filter === 'live'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-red-500/50 hover:scale-105'
              }`}
            >
              {filter === 'live' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <div className={`relative z-10 w-2 h-2 bg-white rounded-full ${filter === 'live' ? 'animate-pulse' : ''}`}></div>
              <span className="relative z-10">Live Now</span>
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                filter === 'upcoming'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-blue-500/50 hover:scale-105'
              }`}
            >
              {filter === 'upcoming' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <span className="relative z-10">Upcoming</span>
            </button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white text-sm focus:outline-none focus:border-yellow-500/50 transition-all cursor-pointer"
            >
              <option value="date" className="bg-slate-900">Date</option>
              <option value="price" className="bg-slate-900">Price</option>
              <option value="popularity" className="bg-slate-900">Popularity</option>
            </select>
          </div>
        </div>
        )}

        {/* All Shows Tab Content */}
        {activeTab === 'all' && (
          <>
        {/* Live Shows Section */}
        {liveShows.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-red-500 rounded-full blur opacity-75"></div>
                  <div className="relative w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
                </div>
                <h2 className="text-3xl font-black text-white">Live Now</h2>
              </div>
              <span className="text-sm text-gray-400 bg-white/10 px-3 py-1 rounded-full">{liveShows.length}</span>
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
              <h2 className="text-3xl font-black text-white">Upcoming Events</h2>
              <span className="text-sm text-gray-400 bg-white/10 px-3 py-1 rounded-full">{upcomingShows.length}</span>
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
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-2xl opacity-50"></div>
              <div className="relative text-6xl">🎟️</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {filter === 'live'
                ? 'No live shows right now'
                : filter === 'upcoming'
                ? 'No upcoming shows'
                : 'No shows available'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {filter === 'live'
                ? 'Check back soon for live events!'
                : filter === 'upcoming'
                ? 'New shows are being added regularly. Check back soon!'
                : 'Be the first to know when creators schedule new shows!'}
            </p>
            <button
              onClick={() => router.push('/explore')}
              className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg shadow-yellow-500/50"
            >
              Explore Creators
            </button>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-12 backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-purple-500/10 rounded-3xl border border-yellow-500/20 p-8">
          <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-3">
            <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            About Premium Events
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Purchase tickets with coins for exclusive access to live events</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Join Q&A sessions, workshops, performances, and meet & greets</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Support your favorite creators directly through ticket sales</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-pink-400 rounded-full mt-1.5 flex-shrink-0"></div>
              <p>Get notifications when shows are about to start</p>
            </div>
          </div>
        </div>
          </>
        )}

        {/* My Tickets Tab Content */}
        {activeTab === 'my-tickets' && (
          <div>
            {myTickets.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-12 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-50"></div>
                  <div className="relative text-6xl">🎟️</div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No tickets yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  You haven't purchased any tickets yet. Browse upcoming shows to get started!
                </p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg shadow-purple-500/50"
                >
                  Browse Shows
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTickets.map((ticket: any) => (
                  <ShowCard
                    key={ticket.id}
                    show={ticket.show}
                    isCreator={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
