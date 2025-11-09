'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type Stream = {
  id: string;
  title: string;
  status: 'live' | 'ended' | 'scheduled';
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  currentViewers: number;
  peakViewers: number;
  durationSeconds?: number;
};

export default function MyStreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'ended'>('all');

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const response = await fetch('/api/streams/my-streams');
      const result = await response.json();

      if (response.ok && result.data) {
        setStreams(result.data.streams || []);
        if (result.degraded) {
          console.warn('Streams data degraded:', result.error);
        }
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStreams = streams.filter((stream) => {
    if (filter === 'live') return stream.status === 'live';
    if (filter === 'ended') return stream.status === 'ended';
    return true;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Streams 🎥</h1>
          <p className="text-gray-400">View and manage your streaming history</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'all'
                ? 'bg-digis-cyan text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            All ({streams.length})
          </button>
          <button
            onClick={() => setFilter('live')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'live'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Live ({streams.filter((s) => s.status === 'live').length})
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              filter === 'ended'
                ? 'bg-gray-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Ended ({streams.filter((s) => s.status === 'ended').length})
          </button>
        </div>

        {/* Streams Grid */}
        {filteredStreams.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center">
            <div className="text-6xl mb-4">📹</div>
            <h3 className="text-xl font-bold text-white mb-2">No streams yet</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all'
                ? 'Start your first stream to see it here!'
                : `No ${filter} streams found`}
            </p>
            <button
              onClick={() => router.push('/creator/go-live')}
              className="bg-gradient-to-r from-digis-cyan to-blue-500 text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
            >
              Go Live Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStreams.map((stream) => (
              <div
                key={stream.id}
                className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:border-digis-cyan transition-all cursor-pointer"
                onClick={() =>
                  stream.status === 'live'
                    ? router.push(`/stream/broadcast/${stream.id}`)
                    : null
                }
              >
                {/* Status Badge */}
                {stream.status === 'live' && (
                  <div className="inline-flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                  {stream.title}
                </h3>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    👁️ {stream.currentViewers || 0} viewers
                  </span>
                  <span className="flex items-center gap-1">
                    📊 {stream.peakViewers || 0} peak
                  </span>
                </div>

                {/* Duration */}
                {stream.durationSeconds && (
                  <div className="text-sm text-gray-400 mb-2">
                    ⏱️ {formatDuration(stream.durationSeconds)}
                  </div>
                )}

                {/* Date */}
                <div className="text-xs text-gray-500">
                  {formatDate(stream.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
