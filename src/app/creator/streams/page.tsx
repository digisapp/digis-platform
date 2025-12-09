'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { CreateShowModal } from '@/components/shows/CreateShowModal';
import { ShowCard } from '@/components/shows/ShowCard';
import { Radio, BarChart3, CheckCircle2, DollarSign, Ticket, History } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

type ShowType = 'hangout' | 'fitness' | 'grwm' | 'try_on_haul' | 'qna' | 'classes' | 'tutorial' | 'music' | 'virtual_date' | 'gaming' | 'other';

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

export default function CreatorStreamsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shows, setShows] = useState<Show[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      console.error('Error fetching streams:', err);
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

  // Separate live, scheduled, and past streams
  const liveStreams = shows.filter(s => s.status === 'live');
  const scheduledStreams = shows.filter(s => s.status === 'scheduled');
  const pastStreams = shows.filter(s => s.status === 'ended' || s.status === 'cancelled');

  const stats = {
    totalStreams: shows.length,
    completed: pastStreams.length,
    totalRevenue: shows.reduce((sum, s) => sum + s.totalRevenue, 0),
    totalTicketsSold: shows.reduce((sum, s) => sum + s.ticketsSold, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      {/* Mobile Header with Logo */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container max-w-7xl mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Streams</h1>
          <GlassButton
            variant="gradient"
            size="md"
            onClick={() => setShowCreateModal(true)}
            shimmer
            glow
            className="!bg-gradient-to-r !from-red-500 !to-pink-500 flex items-center gap-2"
          >
            <Radio className="w-5 h-5" />
            Go Stream
          </GlassButton>
        </div>

        {/* Currently Live */}
        {liveStreams.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <h2 className="text-lg font-bold text-white">Currently Live</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveStreams.map((show) => (
                <ShowCard
                  key={show.id}
                  show={show}
                  isCreator
                  onUpdate={fetchShows}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming (Tickets on Sale) */}
        {scheduledStreams.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">Tickets on Sale</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduledStreams.map((show) => (
                <ShowCard
                  key={show.id}
                  show={show}
                  isCreator
                  onUpdate={fetchShows}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Streams */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-white">Past Streams</h2>
          </div>

          {pastStreams.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl p-8 text-center bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="relative">
                <Radio className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-white mb-2">No streams yet</h3>
                <p className="text-gray-400 mb-6">Go live and connect with your fans!</p>
                <GlassButton
                  variant="gradient"
                  size="md"
                  onClick={() => setShowCreateModal(true)}
                  className="!bg-gradient-to-r !from-red-500 !to-pink-500"
                >
                  <Radio className="w-4 h-4 mr-2" />
                  Start Your First Stream
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastStreams.map((show) => (
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

        {/* Stats Grid */}
        {shows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/10 backdrop-blur-xl border border-white/20 hover:border-purple-400/50 transition-all duration-300">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 w-fit mb-3">
                  <BarChart3 className="w-5 h-5 text-purple-400" strokeWidth={2.5} />
                </div>
                <div className="text-3xl font-black text-white mb-1">{stats.totalStreams}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/10 backdrop-blur-xl border border-white/20 hover:border-green-400/50 transition-all duration-300">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 w-fit mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" strokeWidth={2.5} />
                </div>
                <div className="text-3xl font-black text-green-400 mb-1">{stats.completed}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Completed</div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/10 backdrop-blur-xl border border-white/20 hover:border-pink-400/50 transition-all duration-300">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 w-fit mb-3">
                  <Ticket className="w-5 h-5 text-pink-400" strokeWidth={2.5} />
                </div>
                <div className="text-3xl font-black text-pink-400 mb-1">{stats.totalTicketsSold}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tickets</div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl p-5 bg-white/10 backdrop-blur-xl border border-white/20 hover:border-yellow-400/50 transition-all duration-300">
              <div className="relative">
                <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 w-fit mb-3">
                  <DollarSign className="w-5 h-5 text-yellow-400" strokeWidth={2.5} />
                </div>
                <div className="text-3xl font-black text-yellow-400 mb-1">{stats.totalRevenue}</div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Stream Modal */}
      {showCreateModal && (
        <CreateShowModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleShowCreated}
        />
      )}
    </div>
  );
}
