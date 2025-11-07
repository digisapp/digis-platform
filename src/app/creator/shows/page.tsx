'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { CreateShowModal } from '@/components/shows/CreateShowModal';
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
  scheduledEnd: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  coverImageUrl: string | null;
  totalRevenue: number;
}

export default function CreatorShowsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState<Show[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');

  useEffect(() => {
    checkAuth();
    fetchShows();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    // Check if user is creator
    const response = await fetch('/api/user/profile');
    const data = await response.json();

    if (data.user?.role !== 'creator') {
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  };

  const fetchShows = async () => {
    try {
      const response = await fetch('/api/shows/creator');
      const data = await response.json();
      if (response.ok) {
        setShows(data.shows || []);
      }
    } catch (err) {
      console.error('Error fetching shows:', err);
    }
  };

  const handleShowCreated = () => {
    setShowCreateModal(false);
    fetchShows();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredShows = shows.filter(show => {
    if (filter === 'all') return true;
    return show.status === filter;
  });

  const stats = {
    totalShows: shows.length,
    scheduled: shows.filter(s => s.status === 'scheduled').length,
    completed: shows.filter(s => s.status === 'ended').length,
    totalRevenue: shows.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalTicketsSold: shows.reduce((sum, s) => sum + s.ticketsSold, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Shows 🎟️</h1>
            <p className="text-gray-400">Create and manage your ticketed events</p>
          </div>
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={() => setShowCreateModal(true)}
            shimmer
            glow
          >
            <span className="text-xl mr-2">✨</span>
            Create Show
          </GlassButton>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-2xl font-bold text-white mb-1">{stats.totalShows}</div>
            <div className="text-xs text-gray-400">Total Shows</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-2xl font-bold text-digis-cyan mb-1">{stats.scheduled}</div>
            <div className="text-xs text-gray-400">Upcoming</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-400 mb-1">{stats.completed}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">🎫</div>
            <div className="text-2xl font-bold text-digis-pink mb-1">{stats.totalTicketsSold}</div>
            <div className="text-xs text-gray-400">Tickets Sold</div>
          </div>

          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4 text-center">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-bold text-yellow-400 mb-1">{stats.totalRevenue}</div>
            <div className="text-xs text-gray-400">Total Revenue</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {(['all', 'scheduled', 'live', 'ended'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === tab
                  ? 'bg-digis-cyan text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Shows Grid */}
        {filteredShows.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
            <div className="text-6xl mb-4">🎟️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {filter === 'all' ? 'No shows yet' : `No ${filter} shows`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all'
                ? 'Create your first ticketed show and start earning!'
                : `You don't have any ${filter} shows at the moment.`}
            </p>
            {filter === 'all' && (
              <GlassButton
                variant="gradient"
                size="md"
                onClick={() => setShowCreateModal(true)}
                shimmer
              >
                Create Your First Show
              </GlassButton>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShows.map((show) => (
              <ShowCard
                key={show.id}
                show={show}
                isCreator
                onUpdate={fetchShows}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Show Modal */}
      {showCreateModal && (
        <CreateShowModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleShowCreated}
        />
      )}
    </div>
  );
}
