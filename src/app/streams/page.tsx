'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Search, Coins, Lock, Unlock, Clock, Play, Calendar, Film, Eye } from 'lucide-react';
import Image from 'next/image';
import { STREAM_CATEGORIES, getCategoryById, getCategoryIcon } from '@/lib/constants/stream-categories';

type TabType = 'live' | 'schedule' | 'replays';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface LiveStream {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  currentViewers?: number;
  ticketsSold?: number;
  ticketPrice?: number;
  category?: string | null;
  coverImageUrl?: string | null;
  tags: string[] | null;
  startedAt?: string | null;
  actualStart?: string | null;
  type: 'free' | 'paid';
  isFree: boolean;
  creator: Creator;
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
  durationMinutes: number;
  coverImageUrl: string | null;
  tags: string[] | null;
  creator: Creator;
}

interface VOD {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  isPublic: boolean;
  priceCoins: number;
  viewCount: number;
  createdAt: string;
  creator: Creator;
}

// Popular categories to show as filter pills (subset of all categories)
const POPULAR_CATEGORIES = ['fitness', 'beauty', 'music', 'cooking', 'gaming', 'just-chatting', 'education', 'creative'];

export default function StreamsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [upcomingShows, setUpcomingShows] = useState<UpcomingShow[]>([]);
  const [recentVods, setRecentVods] = useState<VOD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [counts, setCounts] = useState({ live: 0, upcoming: 0, vods: 0 });

  useEffect(() => {
    fetchWatchData(true);

    // Refresh every 30 seconds on mobile, 15 seconds on desktop
    const isMobile = window.innerWidth < 768;
    const refreshInterval = isMobile ? 30000 : 15000;

    const interval = setInterval(() => fetchWatchData(false), refreshInterval);
    return () => clearInterval(interval);
  }, []);

  // Auto-fallback logic: switch tab if current has no content
  useEffect(() => {
    if (!loading) {
      if (activeTab === 'live' && liveStreams.length === 0) {
        if (upcomingShows.length > 0) {
          setActiveTab('schedule');
        } else if (recentVods.length > 0) {
          setActiveTab('replays');
        }
      }
    }
  }, [loading, liveStreams.length, upcomingShows.length, recentVods.length, activeTab]);

  const fetchWatchData = async (bustCache = false) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(
        bustCache ? `/api/watch?t=${Date.now()}` : '/api/watch',
        { cache: 'no-store', signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setLiveStreams(data.liveStreams || []);
        setUpcomingShows(data.upcomingShows || []);
        setRecentVods(data.recentVods || []);
        setCounts(data.counts || { live: 0, upcoming: 0, vods: 0 });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        setError('Failed to load content');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter content by search query and category
  const filterBySearchAndCategory = <T extends { title: string; description?: string | null; creator: Creator; tags?: string[] | null; category?: string | null; showType?: string }>(items: T[]): T[] => {
    let filtered = items;

    // Filter by category if selected
    if (selectedCategory) {
      filtered = filtered.filter(item => {
        const itemCategory = item.category || item.showType;
        return itemCategory?.toLowerCase() === selectedCategory.toLowerCase();
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.creator.displayName?.toLowerCase().includes(query) ||
        item.creator.username?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const filteredLive = filterBySearchAndCategory(liveStreams);
  const filteredSchedule = filterBySearchAndCategory(upcomingShows);
  const filteredVods = filterBySearchAndCategory(recentVods);

  const formatStartTime = (date: Date | string) => {
    const now = new Date();
    const start = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (diffMinutes < 0) {
      const minUntil = Math.abs(diffMinutes);
      if (minUntil < 60) return `in ${minUntil}m`;
      const hours = Math.floor(minUntil / 60);
      if (hours < 24) return `in ${hours}h`;
      const days = Math.floor(hours / 24);
      return `in ${days}d`;
    }

    if (diffMinutes < 1) return 'Just started';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  };

  const formatScheduledDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${timeStr}`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
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
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-48 -left-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] top-1/3 -right-48 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Mobile Header */}
      <MobileHeader />
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container max-w-7xl mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search streams, shows, creators..."
              className="w-full pl-12 pr-4 py-3 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${activeTab === 'live' ? 'bg-white' : 'bg-red-400'} opacity-75 ${counts.live > 0 ? 'animate-ping' : ''}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${activeTab === 'live' ? 'bg-white' : 'bg-red-500'}`}></span>
            </span>
            Live Now
            {counts.live > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'live' ? 'bg-white/20' : 'bg-red-500/20 text-red-400'}`}>
                {counts.live}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Schedule
            {counts.upcoming > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'schedule' ? 'bg-white/20' : 'bg-amber-500/20 text-amber-400'}`}>
                {counts.upcoming}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('replays')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === 'replays'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            <Film className="w-4 h-4" />
            Replays
            {counts.vods > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'replays' ? 'bg-white/20' : 'bg-purple-500/20 text-purple-400'}`}>
                {counts.vods}
              </span>
            )}
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === null
                ? 'bg-white text-black'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
            }`}
          >
            All
          </button>
          {POPULAR_CATEGORIES.map((catId) => {
            const category = getCategoryById(catId);
            if (!category) return null;
            const isSelected = selectedCategory === catId;
            return (
              <button
                key={catId}
                onClick={() => setSelectedCategory(isSelected ? null : catId)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Live Now Tab */}
        {activeTab === 'live' && (
          <div>
            {filteredLive.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLive.map((stream) => (
                  <div
                    key={stream.id}
                    className="group cursor-pointer"
                    onClick={() => {
                      if (stream.type === 'paid') {
                        router.push(`/streams/${stream.id}`);
                      } else {
                        router.push(`/live/${stream.id}`);
                      }
                    }}
                  >
                    <div className="relative">
                      <div className={`absolute -inset-0.5 bg-gradient-to-r ${stream.isFree ? 'from-green-500 to-cyan-500' : 'from-amber-500 to-yellow-500'} rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500`}></div>

                      <div className={`relative backdrop-blur-xl bg-white/10 rounded-2xl border-2 ${stream.isFree ? 'border-green-500/30 group-hover:border-green-500/60' : 'border-amber-500/30 group-hover:border-amber-500/60'} overflow-hidden transition-all duration-300 group-hover:scale-[1.02]`}>
                        {/* Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-gray-900/40 to-slate-900 relative overflow-hidden">
                          {(stream.thumbnailUrl || stream.coverImageUrl) ? (
                            <Image src={stream.thumbnailUrl || stream.coverImageUrl!} alt={stream.title} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-6xl opacity-50">{stream.creator.displayName?.[0] || '🎥'}</div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                          {/* Live Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg shadow-lg shadow-red-500/50">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-white text-xs font-bold">LIVE</span>
                          </div>

                          {/* Free/Paid Badge */}
                          <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            stream.isFree
                              ? 'bg-green-500 text-white'
                              : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
                          }`}>
                            {stream.isFree ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                FREE
                              </>
                            ) : (
                              <>
                                <Coins className="w-3 h-3" />
                                {stream.ticketPrice} coins
                              </>
                            )}
                          </div>

                          {/* Category */}
                          {stream.category && (
                            <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg text-xs font-medium bg-cyan-500/80 text-white">
                              {getCategoryIcon(stream.category)} {getCategoryById(stream.category)?.name || stream.category}
                            </div>
                          )}
                        </div>

                        {/* Stream Info */}
                        <div className="p-4">
                          <h3 className={`text-base font-bold text-white mb-2 line-clamp-1 group-hover:${stream.isFree ? 'text-green-400' : 'text-amber-400'} transition-colors`}>
                            {stream.title}
                          </h3>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {stream.creator.avatarUrl ? (
                                <img
                                  src={stream.creator.avatarUrl}
                                  alt={stream.creator.displayName || ''}
                                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                                />
                              ) : (
                                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${stream.isFree ? 'from-green-500 to-cyan-500' : 'from-amber-500 to-yellow-500'} flex items-center justify-center text-xs font-bold text-white`}>
                                  {stream.creator.displayName?.[0] || stream.creator.username?.[0] || '?'}
                                </div>
                              )}
                              <span className="text-sm text-gray-300 truncate max-w-[120px]">
                                {stream.creator.displayName || stream.creator.username}
                              </span>
                            </div>

                            <span className="text-xs text-gray-400">
                              {(stream.startedAt || stream.actualStart) && formatStartTime(stream.startedAt || stream.actualStart!)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📺</div>
                <h3 className="text-xl font-bold text-white mb-2">No Live Streams Right Now</h3>
                <p className="text-gray-400 mb-6">Check out the schedule or watch some replays!</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:scale-105 transition-transform"
                  >
                    View Schedule
                  </button>
                  <button
                    onClick={() => setActiveTab('replays')}
                    className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
                  >
                    Watch Replays
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            {filteredSchedule.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchedule.map((show) => (
                  <div
                    key={show.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/streams/${show.id}`)}
                  >
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                      <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border-2 border-amber-500/30 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-amber-500/60">
                        {/* Cover Image */}
                        <div className="aspect-video bg-gradient-to-br from-amber-900/40 to-slate-900 relative overflow-hidden">
                          {show.coverImageUrl ? (
                            <Image src={show.coverImageUrl} alt={show.title} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-6xl opacity-50">🎟️</div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                          {/* Schedule Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/50">
                            <Clock className="w-3 h-3 text-black" />
                            <span className="text-black text-xs font-bold">{formatScheduledDate(show.scheduledStart)}</span>
                          </div>

                          {/* Price Badge */}
                          <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg text-black text-xs font-bold flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {show.ticketPrice} coins
                          </div>

                          {/* Tickets Sold */}
                          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs">
                            <Lock className="w-3 h-3" />
                            {show.ticketsSold}{show.maxTickets ? `/${show.maxTickets}` : ''} tickets
                          </div>
                        </div>

                        {/* Show Info */}
                        <div className="p-4">
                          <h3 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-amber-400 transition-colors">
                            {show.title}
                          </h3>

                          <div className="flex items-center gap-2">
                            {show.creator.avatarUrl ? (
                              <img
                                src={show.creator.avatarUrl}
                                alt={show.creator.displayName || ''}
                                className="w-6 h-6 rounded-full object-cover border border-amber-500/30"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-xs font-bold text-black">
                                {show.creator.displayName?.[0] || show.creator.username?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm text-gray-300 truncate">
                              {show.creator.displayName || show.creator.username}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-white mb-2">No Scheduled Shows</h3>
                <p className="text-gray-400 mb-6">Check back later for upcoming streams!</p>
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  Explore Creators
                </button>
              </div>
            )}
          </div>
        )}

        {/* Replays Tab */}
        {activeTab === 'replays' && (
          <div>
            {filteredVods.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVods.map((vod) => (
                  <div
                    key={vod.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/vod/${vod.id}`)}
                  >
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                      <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border-2 border-purple-500/30 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-purple-500/60">
                        {/* Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-purple-900/40 to-slate-900 relative overflow-hidden">
                          {vod.thumbnailUrl ? (
                            <Image src={vod.thumbnailUrl} alt={vod.title} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Play className="w-16 h-16 text-purple-400 opacity-50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                          {/* Duration */}
                          {vod.duration && (
                            <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded-lg text-white text-xs font-medium">
                              {formatDuration(vod.duration)}
                            </div>
                          )}

                          {/* Price Badge */}
                          <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            vod.isPublic || vod.priceCoins === 0
                              ? 'bg-green-500 text-white'
                              : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                          }`}>
                            {vod.isPublic || vod.priceCoins === 0 ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                FREE
                              </>
                            ) : (
                              <>
                                <Coins className="w-3 h-3" />
                                {vod.priceCoins}
                              </>
                            )}
                          </div>

                          {/* View Count */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs">
                            <Eye className="w-3 h-3" />
                            {vod.viewCount} views
                          </div>
                        </div>

                        {/* VOD Info */}
                        <div className="p-4">
                          <h3 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-400 transition-colors">
                            {vod.title}
                          </h3>

                          <div className="flex items-center gap-2">
                            {vod.creator.avatarUrl ? (
                              <img
                                src={vod.creator.avatarUrl}
                                alt={vod.creator.displayName || ''}
                                className="w-6 h-6 rounded-full object-cover border border-purple-500/30"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                                {vod.creator.displayName?.[0] || vod.creator.username?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm text-gray-300 truncate">
                              {vod.creator.displayName || vod.creator.username}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-bold text-white mb-2">No Replays Yet</h3>
                <p className="text-gray-400 mb-6">Check back later for VOD content!</p>
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold hover:scale-105 transition-transform"
                >
                  Explore Creators
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
