'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Stream } from '@/db/schema';

type LiveStream = Stream & {
  creator: {
    id: string;
    displayName: string | null;
    username: string | null;
  };
};

export default function LiveStreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLiveStreams();

    // Refresh every 10 seconds
    const interval = setInterval(fetchLiveStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveStreams = async () => {
    try {
      const response = await fetch('/api/streams/live');
      const data = await response.json();

      if (response.ok) {
        setStreams(data.streams || []);
      } else {
        setError(data.error || 'Failed to load streams');
      }
    } catch (err) {
      setError('Failed to load streams');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchStream = (streamId: string) => {
    router.push(`/stream/${streamId}`);
  };

  const formatStartTime = (date: Date) => {
    const now = new Date();
    const start = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just started';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Live Streams 🎥
              </h1>
              <p className="text-gray-400">
                {streams.length} {streams.length === 1 ? 'creator' : 'creators'} streaming now
              </p>
            </div>
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => router.push('/creator/go-live')}
              shimmer
              glow
            >
              <span className="text-xl mr-2">📹</span>
              Go Live
            </GlassButton>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500 w-fit">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-bold">LIVE NOW</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {streams.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-8xl mb-6">📺</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              No live streams right now
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Be the first to go live! Start streaming and connect with your fans.
            </p>
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => router.push('/creator/go-live')}
              shimmer
              glow
            >
              Start Streaming
            </GlassButton>
          </div>
        )}

        {/* Streams Grid */}
        {streams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {streams.map((stream) => (
              <div
                key={stream.id}
                className="group cursor-pointer"
                onClick={() => handleWatchStream(stream.id)}
              >
                <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 overflow-hidden transition-all duration-300 hover:border-digis-cyan hover:scale-105 hover:shadow-2xl hover:shadow-digis-cyan/20">
                  {/* Thumbnail/Preview */}
                  <div className="aspect-video bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl">{stream.creator.displayName?.[0] || '🎥'}</div>
                    </div>

                    {/* Live Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span className="text-white text-sm font-bold">LIVE</span>
                    </div>

                    {/* Viewer Count */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-lg">
                      <span className="text-white text-sm">👁️</span>
                      <span className="text-white text-sm font-semibold">
                        {stream.currentViewers}
                      </span>
                    </div>

                    {/* Hover Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white">
                        <div className="text-4xl">▶️</div>
                      </div>
                    </div>
                  </div>

                  {/* Stream Info */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-digis-cyan transition-colors">
                      {stream.title}
                    </h3>

                    {stream.description && (
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {stream.description}
                      </p>
                    )}

                    {/* Creator Info */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-sm font-bold">
                          {stream.creator.displayName?.[0] || stream.creator.username?.[0] || '?'}
                        </div>
                        <span className="text-sm font-semibold text-white">
                          {stream.creator.displayName || stream.creator.username}
                        </span>
                      </div>

                      <span className="text-xs text-gray-500">
                        {stream.startedAt && formatStartTime(stream.startedAt)}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <span>👁️</span>
                        <span>{stream.totalViews} views</span>
                      </div>
                      {stream.totalGiftsReceived > 0 && (
                        <div className="flex items-center gap-1">
                          <span>🎁</span>
                          <span>{stream.totalGiftsReceived} coins</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        {streams.length > 0 && (
          <div className="text-center mt-8">
            <GlassButton
              variant="ghost"
              size="md"
              onClick={fetchLiveStreams}
            >
              🔄 Refresh
            </GlassButton>
          </div>
        )}
      </div>
    </div>
  );
}
