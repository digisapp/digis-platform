'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { CreateShowModal } from '@/components/shows/CreateShowModal';
import { ShowCard } from '@/components/shows/ShowCard';
import { Ticket, Plus, BarChart3, Calendar, CheckCircle2, DollarSign, Sparkles } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState<'scheduled' | 'ended'>('scheduled');
  const [categoryFilter, setCategoryFilter] = useState<ShowType | 'all'>('all');

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const filteredShows = shows.filter(show => {
    const matchesStatus = show.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || show.showType === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const categoryOptions = [
    { value: 'all' as const, label: 'All Categories', icon: '📋' },
    { value: 'performance' as const, label: 'Performance', icon: '🎭' },
    { value: 'class' as const, label: 'Class', icon: '🧘' },
    { value: 'qna' as const, label: 'Q&A', icon: '💬' },
    { value: 'hangout' as const, label: 'Hangout', icon: '💕' },
    { value: 'gaming' as const, label: 'Gaming', icon: '🎮' },
    { value: 'workshop' as const, label: 'Workshop', icon: '🎓' },
    { value: 'other' as const, label: 'Other', icon: '🎪' },
  ];

  const stats = {
    totalShows: shows.length,
    scheduled: shows.filter(s => s.status === 'scheduled').length,
    completed: shows.filter(s => s.status === 'ended').length,
    totalRevenue: shows.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalTicketsSold: shows.reduce((sum, s) => sum + s.ticketsSold, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8">
        {/* Status Filter Tabs + Create Show Button */}
        <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
          {(['scheduled', 'ended'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 shadow-lg shadow-yellow-500/50 scale-105'
                  : 'backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:border-yellow-500/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <GlassButton
            variant="gradient"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            shimmer
            glow
            className="md:text-base whitespace-nowrap flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
            Create Paid Stream
          </GlassButton>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categoryOptions.map((category) => (
            <button
              key={category.value}
              onClick={() => setCategoryFilter(category.value)}
              className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap text-sm ${
                categoryFilter === category.value
                  ? 'bg-white text-gray-900 shadow-lg scale-105'
                  : 'backdrop-blur-xl bg-white/10 border border-white/20 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        {/* Shows Grid */}
        {filteredShows.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl p-12 text-center bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/5 via-digis-purple/5 to-digis-pink/5" />
            <div className="relative">
              <div className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 mb-6">
                <Sparkles className="w-16 h-16 text-digis-purple" strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">
                No {statusFilter} streams
              </h3>
              <p className="text-gray-900 text-lg mb-8 max-w-md mx-auto">
                {statusFilter === 'scheduled'
                  ? 'Create your first paid stream and start earning!'
                  : 'Your completed streams will appear here.'}
              </p>
              {statusFilter === 'scheduled' && (
                <GlassButton
                  variant="gradient"
                  size="md"
                  onClick={() => setShowCreateModal(true)}
                  shimmer
                  glow
                  className="shadow-2xl"
                >
                  <Plus className="w-4 h-4 mr-2" strokeWidth={2.5} />
                  Create Paid Stream
                </GlassButton>
              )}
            </div>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mt-8">
          <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/40 backdrop-blur-xl border border-white/60 hover:border-purple-300 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 w-fit mb-3">
                <BarChart3 className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{stats.totalShows}</div>
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Total Streams</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/40 backdrop-blur-xl border border-white/60 hover:border-cyan-300 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 w-fit mb-3">
                <Calendar className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
              </div>
              <div className="text-3xl font-black text-cyan-600 mb-1">{stats.scheduled}</div>
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Upcoming</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/40 backdrop-blur-xl border border-white/60 hover:border-green-300 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 w-fit mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" strokeWidth={2.5} />
              </div>
              <div className="text-3xl font-black text-green-600 mb-1">{stats.completed}</div>
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Completed</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/40 backdrop-blur-xl border border-white/60 hover:border-pink-300 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 w-fit mb-3">
                <Ticket className="w-5 h-5 text-pink-600" strokeWidth={2.5} />
              </div>
              <div className="text-3xl font-black text-pink-600 mb-1">{stats.totalTicketsSold}</div>
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Tickets Sold</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/40 backdrop-blur-xl border border-white/60 hover:border-yellow-300 transition-all duration-300 hover:shadow-2xl hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 w-fit mb-3">
                <DollarSign className="w-5 h-5 text-yellow-600" strokeWidth={2.5} />
              </div>
              <div className="text-3xl font-black text-yellow-600 mb-1">{stats.totalRevenue}</div>
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Total Revenue</div>
            </div>
          </div>
        </div>
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
