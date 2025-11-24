'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Video, Eye, Clock, Coins, Calendar, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Stream {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  peakViewers: number;
  totalViews: number;
  totalGifts: number;
  duration: number | null;
}

export default function StreamHistoryPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'live'>('all');

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await fetch('/api/streams/my-streams');
      if (response.ok) {
        const data = await response.json();
        setStreams(data.streams || []);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStreams = streams.filter(stream => {
    if (filter === 'all') return true;
    if (filter === 'live') return stream.status === 'live';
    if (filter === 'completed') return stream.status === 'ended';
    return true;
  });

  const totalViews = streams.reduce((sum, s) => sum + (s.totalViews || 0), 0);
  const totalGifts = streams.reduce((sum, s) => sum + (s.totalGifts || 0), 0);
  const avgViewers = streams.length > 0
    ? Math.round(streams.reduce((sum, s) => sum + (s.peakViewers || 0), 0) / streams.length)
    : 0;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800 mb-4 flex items-center gap-2"
          >
            ← Back to Analytics
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Stream History 🎥</h1>
          <p className="text-gray-600">Review your streaming performance and analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-purple-500" />
              <span className="text-gray-600 text-sm">Total Streams</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{streams.length}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-digis-cyan" />
              <span className="text-gray-600 text-sm">Total Views</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalViews}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-gray-600 text-sm">Avg Peak Viewers</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{avgViewers}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-gray-600 text-sm">Total Gifts</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalGifts}</p>
          </GlassCard>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-digis-cyan to-purple-500 text-white'
                : 'bg-white/50 text-gray-700 hover:bg-white/70'
            }`}
          >
            All Streams
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'live'
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-gray-900'
                : 'bg-white/50 text-gray-700 hover:bg-white/70'
            }`}
          >
            Live Now
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-gray-900'
                : 'bg-white/50 text-gray-700 hover:bg-white/70'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Streams List */}
        {filteredStreams.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {filter === 'all' ? 'No streams yet' : `No ${filter} streams`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'Start your first stream to see it here!'
                : 'Try changing the filter to see other streams'}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {filteredStreams.map((stream) => (
              <GlassCard key={stream.id} className="p-6 hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between gap-4">
                  {/* Stream Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{stream.title || 'Untitled Stream'}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        stream.status === 'live'
                          ? 'bg-red-500 text-white animate-pulse'
                          : stream.status === 'ended'
                          ? 'bg-green-500/20 text-green-700'
                          : 'bg-gray-500/20 text-gray-700'
                      }`}>
                        {stream.status === 'live' ? '🔴 LIVE' : stream.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(stream.startedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {stream.duration ? formatDuration(stream.duration) : 'In progress'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-digis-cyan" />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">{stream.totalViews}</span> views
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">{stream.peakViewers}</span> peak
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="text-sm text-gray-700">
                          <span className="font-semibold">{stream.totalGifts}</span> gifts
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Started Time */}
                  <div className="text-right text-sm text-gray-600">
                    {formatDistanceToNow(new Date(stream.startedAt), { addSuffix: true })}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
