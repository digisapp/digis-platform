'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { Tv, Search, Radio } from 'lucide-react';
import type { Stream } from '@/db/schema';

type LiveStream = Stream & {
  creator: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

export default function LiveStreamsPage() {
  const router = useRouter();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'viewers' | 'coins'>('viewers');
  const [userRole, setUserRole] = useState<'fan' | 'creator'>('fan');

  useEffect(() => {
    fetchUserRole();
    fetchLiveStreams();

    // Refresh every 30 seconds on mobile, 15 seconds on desktop for better performance
    const isMobile = window.innerWidth < 768;
    const refreshInterval = isMobile ? 30000 : 15000;

    const interval = setInterval(fetchLiveStreams, refreshInterval);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort streams - useMemo to prevent recalculation on every render
  useEffect(() => {
    // Defer filtering/sorting to not block main thread
    const timeoutId = setTimeout(() => {
      let filtered = [...streams];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (stream) =>
            stream.title.toLowerCase().includes(query) ||
            stream.description?.toLowerCase().includes(query) ||
            stream.creator.displayName?.toLowerCase().includes(query) ||
            stream.creator.username?.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'viewers':
            return b.currentViewers - a.currentViewers;
          case 'coins':
            return b.totalGiftsReceived - a.totalGiftsReceived;
          case 'recent':
          default:
            return new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime();
        }
      });

      setFilteredStreams(filtered);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [streams, searchQuery, sortBy]);

  const fetchUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        if (data.user?.role) {
          setUserRole(data.user.role);
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const fetchLiveStreams = async () => {
    try {
      const response = await fetch('/api/streams/live');
      const result = await response.json();

      if (response.ok && result.data) {
        setStreams(result.data.streams || []);
        if (result.degraded) {
          console.warn('Live streams data degraded:', result.error);
        }
      } else {
        setError(result.error || 'Failed to load streams');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 relative overflow-hidden">
      {/* Animated Background Mesh - Tron with Red LIVE accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-48 -left-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] top-1/3 -right-48 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          {userRole === 'creator' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-white via-red-200 to-white bg-clip-text text-transparent">
                  Live Streams
                </h1>
                <p className="text-gray-400 text-sm">
                  <span className="text-white font-semibold">{filteredStreams.length}</span> of {streams.length} {streams.length === 1 ? 'stream' : 'streams'} live now
                </p>
              </div>
              <button
                onClick={() => router.push('/creator/go-live')}
                className="group relative overflow-hidden px-6 py-3 rounded-2xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-red-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white hover:scale-105 transition-all duration-500 flex items-center gap-2 shadow-lg shadow-red-500/50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12"></div>
                <Radio className="relative z-10 w-5 h-5" />
                <span className="relative z-10">Go Live</span>
              </button>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search streams, creators..."
                className="w-full px-4 py-3 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)]"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 rounded-2xl text-white focus:outline-none focus:border-cyan-500 transition-all cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            >
              <option value="viewers" className="bg-gray-900">Most Viewers</option>
              <option value="recent" className="bg-gray-900">Recently Started</option>
              <option value="coins" className="bg-gray-900">Most Coins</option>
            </select>
          </div>

          {/* Live Indicator - Only show for creators */}
          {userRole === 'creator' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 backdrop-blur-md rounded-xl border border-red-500/50 w-fit mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50" />
              <span className="text-red-400 font-bold text-sm">LIVE NOW</span>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {filteredStreams.length === 0 && !error && streams.length === 0 && (
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-2xl opacity-50"></div>
              <Tv className="relative w-32 h-32 text-white mx-auto" strokeWidth={1.5} />
            </div>
            {userRole === 'creator' ? (
              <>
                <h2 className="text-3xl font-bold text-white mb-4">
                  No live streams right now
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Be the first to go live! Start streaming and connect with your fans.
                </p>
                <button
                  onClick={() => router.push('/creator/go-live')}
                  className="group relative overflow-hidden px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-red-600 text-white hover:scale-105 transition-all shadow-lg shadow-red-500/50"
                >
                  Start Streaming
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white mb-4">
                  No streams available
                </h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Check back soon for live streams from your favorite creators!
                </p>
              </>
            )}
          </div>
        )}

        {/* No Search Results */}
        {filteredStreams.length === 0 && streams.length > 0 && (
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-2xl opacity-50"></div>
              <Search className="relative w-32 h-32 text-white mx-auto" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              No streams found
            </h2>
            <p className="text-gray-400 mb-8">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSortBy('viewers');
              }}
              className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:border-cyan-500/50 transition-all hover:scale-105"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Streams Grid */}
        {filteredStreams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStreams.map((stream) => (
              <div
                key={stream.id}
                className="group cursor-pointer"
                onClick={() => handleWatchStream(stream.id)}
              >
                {/* Neon Glow Effect */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                  <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden transition-all duration-500 hover:scale-105 hover:border-red-500/50">
                    {/* Thumbnail/Preview */}
                    <div className="aspect-video bg-gradient-to-br from-red-900/40 via-purple-900/40 to-slate-900 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-6xl opacity-50">{stream.creator.displayName?.[0] || '🎥'}</div>
                      </div>

                      {/* Animated gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                      {/* Live Badge with Neon Glow */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg shadow-lg shadow-red-500/50">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-white text-sm font-bold">LIVE</span>
                      </div>

                      {/* Viewer Count */}
                      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/20">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-white text-sm font-semibold">
                          {stream.currentViewers}
                        </span>
                      </div>

                      {/* Hover Play Icon */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm">
                        <div className="relative">
                          <div className="absolute -inset-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur opacity-75"></div>
                          <div className="relative w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center shadow-xl">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
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
                          {stream.creator.avatarUrl ? (
                            <img
                              src={stream.creator.avatarUrl}
                              alt={stream.creator.displayName || stream.creator.username || 'Creator'}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
                              {stream.creator.displayName?.[0] || stream.creator.username?.[0] || '?'}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-white">
                            {stream.creator.displayName || stream.creator.username}
                          </span>
                        </div>

                        <span className="text-xs text-gray-400">
                          {stream.startedAt && formatStartTime(stream.startedAt)}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                          </svg>
                          <span>{stream.totalViews} views</span>
                        </div>
                        {stream.totalGiftsReceived > 0 && (
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/>
                            </svg>
                            <span className="text-yellow-400">{stream.totalGiftsReceived} coins</span>
                          </div>
                        )}
                      </div>
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
            <button
              onClick={fetchLiveStreams}
              className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:border-cyan-500/50 transition-all hover:scale-105 flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
