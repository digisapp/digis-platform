'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { Clock, Users, Eye } from 'lucide-react';

interface LiveStream {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  status: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface FeaturedCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  isLive: boolean;
}

interface UpcomingShow {
  id: string;
  title: string;
  description: string | null;
  showType: string;
  ticketPrice: number;
  ticketsSold: number;
  maxTickets: number | null;
  scheduledStart: string;
  coverImageUrl: string | null;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function FanDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [upcomingShows, setUpcomingShows] = useState<UpcomingShow[]>([]);

  useEffect(() => {
    checkAuth();
    fetchContent();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    setLoading(false);
  };

  const fetchContent = async () => {
    try {
      // Fetch live streams
      const streamsRes = await fetch('/api/streams/live');
      if (streamsRes.ok) {
        const streamsData = await streamsRes.json();
        setLiveStreams(streamsData.streams || []);
      }

      // Fetch featured creators (from explore)
      const creatorsRes = await fetch('/api/explore?limit=6');
      if (creatorsRes.ok) {
        const creatorsData = await creatorsRes.json();
        setFeaturedCreators(creatorsData.data?.creators || []);
      }

      // Fetch upcoming shows
      const showsRes = await fetch('/api/shows/upcoming');
      if (showsRes.ok) {
        const showsData = await showsRes.json();
        setUpcomingShows((showsData.shows || []).slice(0, 6));
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    }
  };

  const formatShowDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    return 'Soon';
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
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 top-1/3 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-96 h-96 bottom-10 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header */}
      <MobileHeader />

      <div className="container mx-auto px-4 pt-14 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Live Streams Section */}
        {liveStreams.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-red-500 rounded-full blur opacity-75"></div>
                  <div className="relative w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
                </div>
                <h2 className="text-3xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Live Now</h2>
                <span className="text-sm text-cyan-400 bg-white/5 px-3 py-1 rounded-full border border-cyan-500/30">{liveStreams.length}</span>
              </div>
              <button
                onClick={() => router.push('/live')}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveStreams.slice(0, 8).map((stream) => (
                <div
                  key={stream.id}
                  onClick={() => router.push(`/live/${stream.creator.username}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-3">
                    {stream.thumbnailUrl ? (
                      <img
                        src={stream.thumbnailUrl}
                        alt={stream.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-4xl">🎥</span>
                      </div>
                    )}

                    {/* Live Badge */}
                    <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>

                    {/* Viewer Count */}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {stream.viewerCount}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>

                  {/* Stream Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      {stream.creator.avatarUrl ? (
                        <img src={stream.creator.avatarUrl} alt={stream.creator.displayName || stream.creator.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">{(stream.creator.displayName || stream.creator.username)[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1">{stream.title}</h3>
                      <p className="text-gray-400 text-xs line-clamp-1">{stream.creator.displayName || stream.creator.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured Creators Section */}
        {featuredCreators.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Featured Creators</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {featuredCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => router.push(`/${creator.username}`)}
                  className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] group relative rounded-2xl border-2 border-cyan-500/30 hover:border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  {/* 4:5 Portrait Card */}
                  <div className="relative w-full overflow-hidden rounded-2xl" style={{paddingBottom: '125%'}}>
                    {creator.avatarUrl ? (
                      <>
                        <img
                          src={creator.avatarUrl}
                          alt={creator.displayName || creator.username}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <Users className="w-16 h-16 text-cyan-400" />
                      </div>
                    )}

                    {/* Live indicator */}
                    {creator.isLive && (
                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}

                    {/* Creator info overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-sm bg-white/10 border-t border-cyan-500/30 group-hover:bg-white/20 transition-all duration-300">
                      <h3 className="text-sm font-bold text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {creator.displayName || creator.username}
                      </h3>
                      <p className="text-cyan-400 text-xs flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3" />
                        {creator.followerCount}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Shows Section */}
        {upcomingShows.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Upcoming Shows</h2>
              <button
                onClick={() => router.push('/shows')}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingShows.map((show) => (
                <div
                  key={show.id}
                  onClick={() => router.push(`/shows/${show.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 overflow-hidden hover:border-cyan-500/50 hover:scale-105 transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    {/* Cover Image */}
                    <div className="relative aspect-video bg-slate-900">
                      {show.coverImageUrl ? (
                        <img src={show.coverImageUrl} alt={show.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                          <span className="text-5xl">🎟️</span>
                        </div>
                      )}

                      {/* Time Badge */}
                      <div className="absolute top-3 right-3 bg-yellow-500 text-gray-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatShowDate(show.scheduledStart)}
                      </div>
                    </div>

                    {/* Show Info */}
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">{show.title}</h3>

                      {/* Creator */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                          {show.creator.avatarUrl ? (
                            <img src={show.creator.avatarUrl} alt={show.creator.displayName || show.creator.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">{(show.creator.displayName || show.creator.username)[0].toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">{show.creator.displayName || show.creator.username}</span>
                      </div>

                      {/* Price & Tickets */}
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-400 font-bold">{show.ticketPrice} coins</span>
                        <span className="text-gray-400 text-xs">
                          {show.ticketsSold}/{show.maxTickets || '∞'} sold
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Only if nothing to show */}
        {liveStreams.length === 0 && featuredCreators.length === 0 && upcomingShows.length === 0 && (
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 p-12 text-center shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-3">Welcome to Digis!</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              No live content right now, but there's plenty to discover
            </p>
            <button
              onClick={() => router.push('/explore')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
            >
              Explore Creators
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
