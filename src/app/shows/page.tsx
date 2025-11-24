'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ShowCard } from '@/components/shows/ShowCard';
import { Ticket } from 'lucide-react';

type ShowType = 'performance' | 'class' | 'qna' | 'hangout' | 'gaming' | 'workshop' | 'other';

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

export default function ShowsDirectoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState<Show[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my-tickets'>('all');
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('live');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Filter Tabs */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-3 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
            <button
              onClick={() => {
                setActiveTab('all');
                setFilter('live');
              }}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'all' && filter === 'live'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-sm scale-105'
                  : 'backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 text-white hover:border-red-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'all' && filter === 'live' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <div className={`relative z-10 w-2 h-2 ${activeTab === 'all' && filter === 'live' ? 'bg-white animate-pulse' : 'bg-red-500'} rounded-full`}></div>
              <span className="relative z-10">Live Now</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('all');
                setFilter('upcoming');
              }}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'all' && filter === 'upcoming'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm scale-105'
                  : 'backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 text-white hover:border-blue-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'all' && filter === 'upcoming' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <span className="relative z-10">Upcoming</span>
            </button>
            <button
              onClick={() => setActiveTab('my-tickets')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'my-tickets'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm scale-105'
                  : 'backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 text-white hover:border-purple-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'my-tickets' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <span className="relative z-10">My Tickets</span>
            </button>
          </div>

          {/* Sort - Only show on All Shows tab */}
          {activeTab === 'all' && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 whitespace-nowrap">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 backdrop-blur-xl bg-white/10 backdrop-blur-md border border-cyan-500/30 rounded-2xl text-gray-300 text-sm focus:outline-none focus:border-yellow-500/50 transition-all cursor-pointer"
              >
                <option value="date" className="bg-white">Date</option>
                <option value="price" className="bg-white">Price</option>
                <option value="popularity" className="bg-white">Popularity</option>
              </select>
            </div>
          )}
        </div>

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
              <span className="text-sm text-gray-400 backdrop-blur-xl bg-white/5 px-3 py-1 rounded-full border border-cyan-500/30">{liveShows.length}</span>
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
              <span className="text-sm text-gray-400 backdrop-blur-xl bg-white/5 px-3 py-1 rounded-full border border-cyan-500/30">{upcomingShows.length}</span>
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
          <div className="backdrop-blur-xl backdrop-blur-xl bg-white/10 rounded-3xl border border-cyan-500/30 p-12 text-center shadow-sm">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full blur-2xl opacity-30"></div>
              <Ticket className="relative w-24 h-24 text-white mx-auto" strokeWidth={1.5} />
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
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 rounded-2xl font-bold hover:scale-105 transition-all shadow-sm"
            >
              Explore Creators
            </button>
          </div>
        )}

          </>
        )}

        {/* My Tickets Tab Content */}
        {activeTab === 'my-tickets' && (
          <div>
            {myTickets.length === 0 ? (
              <div className="backdrop-blur-xl backdrop-blur-xl bg-white/10 rounded-3xl border border-cyan-500/30 p-12 text-center shadow-sm">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-30"></div>
                  <Ticket className="relative w-24 h-24 text-white mx-auto" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No tickets yet</h3>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  You haven't purchased any tickets yet. Browse upcoming shows to get started!
                </p>
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-sm"
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

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
