'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { useAuth } from '@/context/AuthContext';
import { Search, Coins, Lock, Unlock, Hash, ChevronDown, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { Stream } from '@/db/schema';
import { STREAM_CATEGORIES, getCategoryById, getCategoryIcon } from '@/lib/constants/stream-categories';

// Free live stream type
type LiveStream = Stream & {
  creator: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  isFree: true;
};

// Paid show type
interface PaidShow {
  id: string;
  title: string;
  description: string | null;
  showType: string;
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
  isFree: false;
}

// Combined type for display
type CombinedStream = (LiveStream & { type: 'free' }) | (PaidShow & { type: 'paid' });

// Suggested creator type
interface SuggestedCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isCreatorVerified: boolean;
  isOnline: boolean;
  primaryCategory: string | null;
  followerCount: number;
}

export default function LiveStreamsPage() {
  const router = useRouter();
  const { isCreator } = useAuth();
  const [freeStreams, setFreeStreams] = useState<LiveStream[]>([]);
  const [paidShows, setPaidShows] = useState<PaidShow[]>([]);
  const [topCreators, setTopCreators] = useState<SuggestedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Use AuthContext instead of separate API call
  const userRole = isCreator ? 'creator' : 'fan';

  useEffect(() => {
    fetchAllStreams(true);

    // Refresh every 30 seconds on mobile, 15 seconds on desktop
    const isMobile = window.innerWidth < 768;
    const refreshInterval = isMobile ? 30000 : 15000;

    const interval = setInterval(() => fetchAllStreams(false), refreshInterval);
    return () => clearInterval(interval);
  }, []);

  const fetchAllStreams = async (bustCache = false) => {
    // Create abort controller with 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // Fetch streams, paid shows, and suggested creators in parallel
      const [freeRes, paidRes, suggestedRes] = await Promise.all([
        fetch(bustCache ? `/api/streams/live?t=${Date.now()}` : '/api/streams/live', {
          cache: 'no-store',
          signal: controller.signal,
        }).catch(() => null),
        fetch(bustCache ? `/api/shows/upcoming?t=${Date.now()}` : '/api/shows/upcoming', {
          cache: 'no-store',
          signal: controller.signal,
        }).catch(() => null),
        fetch('/api/streams/suggested-creators', {
          cache: 'no-store',
          signal: controller.signal,
        }).catch(() => null),
      ]);

      clearTimeout(timeoutId);

      if (freeRes?.ok) {
        const freeData = await freeRes.json();
        setFreeStreams((freeData.data?.streams || []).map((s: any) => ({ ...s, isFree: true })));
      }

      if (paidRes?.ok) {
        const paidData = await paidRes.json();
        setPaidShows((paidData.shows || []).map((s: any) => ({ ...s, isFree: false })));
      }

      if (suggestedRes?.ok) {
        const suggestedData = await suggestedRes.json();
        setTopCreators(suggestedData.topCreators || []);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        setError('Failed to load streams');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get filtered streams - separate free and paid
  const getFilteredStreams = () => {
    const query = searchQuery.trim().toLowerCase();

    // Filter paid shows (only live ones)
    let filteredPaid = paidShows.filter(show => show.status === 'live');
    if (query) {
      filteredPaid = filteredPaid.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.creator.displayName?.toLowerCase().includes(query) ||
        s.creator.username?.toLowerCase().includes(query)
      );
    }
    // Sort by ticket sales
    filteredPaid.sort((a, b) => b.ticketsSold - a.ticketsSold);

    // Filter free streams
    let filteredFree = [...freeStreams];
    if (query) {
      filteredFree = filteredFree.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.creator.displayName?.toLowerCase().includes(query) ||
        s.creator.username?.toLowerCase().includes(query)
      );
    }
    // Apply category filter
    if (filterCategory) {
      filteredFree = filteredFree.filter(s => s.category === filterCategory);
    }
    // Sort by viewers
    filteredFree.sort((a, b) => b.currentViewers - a.currentViewers);

    return { paidStreams: filteredPaid, freeStreamsFiltered: filteredFree };
  };

  const { paidStreams, freeStreamsFiltered } = getFilteredStreams();
  const hasAnyStreams = paidStreams.length > 0 || freeStreamsFiltered.length > 0;

  const formatStartTime = (date: Date | string) => {
    const now = new Date();
    const start = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (diffMinutes < 0) {
      // Future time
      const minUntil = Math.abs(diffMinutes);
      if (minUntil < 60) return `Starts in ${minUntil}m`;
      const hours = Math.floor(minUntil / 60);
      if (hours < 24) return `Starts in ${hours}h`;
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d`;
    }

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
        {/* Header - Search Only */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search streams, creators..."
              className="w-full pl-12 pr-4 py-3 backdrop-blur-2xl bg-black/40 border-2 border-cyan-500/30 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Paid Shows Section - First for visibility */}
        {paidStreams.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎟️</span>
                <h2 className="text-xl md:text-2xl font-bold text-white">Paid Shows</h2>
                <span className="relative flex h-2.5 w-2.5 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              </div>
              <span className="text-sm text-gray-400">({paidStreams.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paidStreams.map((show) => (
                <div
                  key={show.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/streams/${show.id}`)}
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                    <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border-2 border-amber-500/30 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-amber-500/60">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-amber-900/40 via-purple-900/40 to-slate-900 relative overflow-hidden">
                        {show.coverImageUrl ? (
                          <img src={show.coverImageUrl} alt={show.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-6xl opacity-50">{show.creator.displayName?.[0] || '🎥'}</div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                        {/* Live Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg shadow-lg shadow-red-500/50">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <span className="text-white text-xs font-bold">LIVE</span>
                        </div>

                        {/* Price Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg text-black text-xs font-bold flex items-center gap-1 shadow-lg shadow-amber-500/30">
                          <Coins className="w-3 h-3" />
                          {show.ticketPrice} coins
                        </div>

                        {/* Tickets Sold */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs">
                          <Lock className="w-3 h-3" />
                          {show.ticketsSold} watching
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
          </div>
        )}

        {/* Free Streams Section */}
        {freeStreamsFiltered.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold text-white">Free Streams</h2>
                </div>
                <span className="text-sm text-gray-400">({freeStreamsFiltered.length})</span>
              </div>

              {/* Category Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
                    filterCategory
                      ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {filterCategory ? (
                    <>
                      <span>{getCategoryIcon(filterCategory)}</span>
                      <span>{getCategoryById(filterCategory)?.name}</span>
                    </>
                  ) : (
                    <>
                      <Hash className="w-3 h-3" />
                      <span>Category</span>
                    </>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCategoryDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)} />
                    <div className="absolute top-full right-0 mt-2 w-56 max-h-80 overflow-y-auto bg-gray-900 border border-white/20 rounded-xl shadow-xl z-50">
                      <button
                        onClick={() => { setFilterCategory(''); setShowCategoryDropdown(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                      >
                        <span className="text-lg">🎬</span>
                        <span>All Categories</span>
                      </button>
                      {STREAM_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => { setFilterCategory(cat.id); setShowCategoryDropdown(false); }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-2 ${
                            filterCategory === cat.id ? 'text-cyan-400 bg-white/5' : 'text-gray-300'
                          }`}
                        >
                          <span className="text-lg">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {freeStreamsFiltered.map((stream) => (
                <div
                  key={stream.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/live/${stream.id}`)}
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-cyan-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                    <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-green-500/50">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-green-900/40 via-cyan-900/40 to-slate-900 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-6xl opacity-50">{stream.creator.displayName?.[0] || '🎥'}</div>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                        {/* Live Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg shadow-lg shadow-red-500/50">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          <span className="text-white text-xs font-bold">LIVE</span>
                        </div>

                        {/* Free Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-green-500 rounded-lg text-white text-xs font-bold flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          FREE
                        </div>

                        {/* Viewer Count */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                          </svg>
                          {stream.currentViewers}
                        </div>
                      </div>

                      {/* Stream Info */}
                      <div className="p-4">
                        <h3 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-green-400 transition-colors">
                          {stream.title}
                        </h3>

                        {/* Category & Tags */}
                        {(stream.category || (stream.tags && stream.tags.length > 0)) && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {stream.category && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-300">
                                <span>{getCategoryIcon(stream.category)}</span>
                                <span>{getCategoryById(stream.category)?.name || stream.category}</span>
                              </span>
                            )}
                            {stream.tags?.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {stream.creator.avatarUrl ? (
                              <img
                                src={stream.creator.avatarUrl}
                                alt={stream.creator.displayName || ''}
                                className="w-6 h-6 rounded-full object-cover border border-white/20"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                                {stream.creator.displayName?.[0] || stream.creator.username?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm text-gray-300 truncate max-w-[120px]">
                              {stream.creator.displayName || stream.creator.username}
                            </span>
                          </div>

                          <span className="text-xs text-gray-400">
                            {stream.startedAt && formatStartTime(stream.startedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Show Suggested Creators */}
        {!hasAnyStreams && (
          <div className="space-y-8">
            {/* Top Creators */}
            {topCreators.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-white">Top Creators</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {topCreators.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => router.push(`/${creator.username}`)}
                      className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all text-center"
                    >
                      <div className="relative inline-block mb-3">
                        {creator.avatarUrl ? (
                          <Image
                            src={creator.avatarUrl}
                            alt={creator.displayName || creator.username}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-full object-cover mx-auto"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white mx-auto">
                            {(creator.displayName || creator.username)?.[0]?.toUpperCase()}
                          </div>
                        )}
                        {creator.isOnline && (
                          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full" />
                        )}
                      </div>
                      <h4 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
                        {creator.displayName || creator.username}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        @{creator.username}
                        {creator.isCreatorVerified && (
                          <span className="ml-1 text-cyan-400">✓</span>
                        )}
                      </p>
                      {creator.followerCount > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          {creator.followerCount.toLocaleString()} followers
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Fallback if no creators */}
            {topCreators.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No creators to show yet</p>
                <button
                  onClick={() => router.push('/explore')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl hover:scale-105 transition-transform"
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
