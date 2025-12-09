'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { Tv, Search, Radio, Ticket, Coins, Lock, Unlock } from 'lucide-react';
import type { Stream } from '@/db/schema';

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

export default function LiveStreamsPage() {
  const router = useRouter();
  const [freeStreams, setFreeStreams] = useState<LiveStream[]>([]);
  const [paidShows, setPaidShows] = useState<PaidShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');
  const [userRole, setUserRole] = useState<'fan' | 'creator'>('fan');

  useEffect(() => {
    fetchUserRole();
    fetchAllStreams(true);

    // Refresh every 30 seconds on mobile, 15 seconds on desktop
    const isMobile = window.innerWidth < 768;
    const refreshInterval = isMobile ? 30000 : 15000;

    const interval = setInterval(() => fetchAllStreams(false), refreshInterval);
    return () => clearInterval(interval);
  }, []);

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

  const fetchAllStreams = async (bustCache = false) => {
    try {
      // Fetch both free streams and paid shows in parallel
      const [freeRes, paidRes] = await Promise.all([
        fetch(bustCache ? `/api/streams/live?t=${Date.now()}` : '/api/streams/live', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
        fetch(bustCache ? `/api/shows/upcoming?t=${Date.now()}` : '/api/shows/upcoming', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        }),
      ]);

      if (freeRes.ok) {
        const freeData = await freeRes.json();
        setFreeStreams((freeData.data?.streams || []).map((s: any) => ({ ...s, isFree: true })));
      }

      if (paidRes.ok) {
        const paidData = await paidRes.json();
        setPaidShows((paidData.shows || []).map((s: any) => ({ ...s, isFree: false })));
      }
    } catch (err) {
      setError('Failed to load streams');
    } finally {
      setLoading(false);
    }
  };

  // Combine and filter streams
  const getCombinedStreams = (): { liveNow: CombinedStream[], upcoming: PaidShow[] } => {
    let liveNow: CombinedStream[] = [];
    let upcoming: PaidShow[] = [];

    // Add free streams (they're always live)
    freeStreams.forEach(stream => {
      liveNow.push({ ...stream, type: 'free' as const });
    });

    // Add paid shows based on status
    paidShows.forEach(show => {
      if (show.status === 'live') {
        liveNow.push({ ...show, type: 'paid' as const });
      } else if (show.status === 'scheduled') {
        upcoming.push(show);
      }
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      liveNow = liveNow.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.creator.displayName?.toLowerCase().includes(query) ||
        s.creator.username?.toLowerCase().includes(query)
      );
      upcoming = upcoming.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.creator.displayName?.toLowerCase().includes(query) ||
        s.creator.username?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType === 'free') {
      liveNow = liveNow.filter(s => s.type === 'free');
      upcoming = [];
    } else if (filterType === 'paid') {
      liveNow = liveNow.filter(s => s.type === 'paid');
    }

    // Sort live streams by viewers (free) or ticket sales (paid)
    liveNow.sort((a, b) => {
      if (a.type === 'free' && b.type === 'free') {
        return b.currentViewers - a.currentViewers;
      }
      if (a.type === 'paid' && b.type === 'paid') {
        return b.ticketsSold - a.ticketsSold;
      }
      // Show paid first, then free
      return a.type === 'paid' ? -1 : 1;
    });

    // Sort upcoming by start time
    upcoming.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

    return { liveNow, upcoming };
  };

  const { liveNow, upcoming } = getCombinedStreams();

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

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* Header */}
        <div className="mb-6">
          {/* Search Bar */}
          <div className="mb-4">
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

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', icon: null },
              { key: 'free', label: 'Free', icon: Unlock },
              { key: 'paid', label: 'Paid', icon: Lock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilterType(key as any)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                  filterType === key
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Live Now Section */}
        {liveNow.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <h2 className="text-xl font-bold text-white">Live Now</h2>
              </div>
              <span className="text-sm text-gray-400">({liveNow.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveNow.map((stream) => (
                <div
                  key={stream.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(stream.type === 'free' ? `/stream/${stream.id}` : `/streams/${stream.id}`)}
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                    <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-red-500/50">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-red-900/40 via-purple-900/40 to-slate-900 relative overflow-hidden">
                        {stream.type === 'paid' && stream.coverImageUrl ? (
                          <img src={stream.coverImageUrl} alt={stream.title} className="w-full h-full object-cover" />
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

                        {/* Price Badge */}
                        <div className="absolute top-3 right-3">
                          {stream.type === 'free' ? (
                            <div className="px-3 py-1.5 bg-green-500 rounded-lg text-white text-xs font-bold flex items-center gap-1">
                              <Unlock className="w-3 h-3" />
                              FREE
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg text-black text-xs font-bold flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              {stream.ticketPrice}
                            </div>
                          )}
                        </div>

                        {/* Viewer Count */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                          </svg>
                          {stream.type === 'free' ? stream.currentViewers : stream.ticketsSold}
                        </div>
                      </div>

                      {/* Stream Info */}
                      <div className="p-4">
                        <h3 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-red-400 transition-colors">
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
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                {stream.creator.displayName?.[0] || stream.creator.username?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm text-gray-300 truncate max-w-[120px]">
                              {stream.creator.displayName || stream.creator.username}
                            </span>
                          </div>

                          <span className="text-xs text-gray-400">
                            {stream.type === 'free' && stream.startedAt && formatStartTime(stream.startedAt)}
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

        {/* Tickets Available Section */}
        {upcoming.length > 0 && filterType !== 'free' && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">Tickets Available</h2>
              <span className="text-sm text-gray-400">({upcoming.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((show) => (
                <div
                  key={show.id}
                  className="group cursor-pointer"
                  onClick={() => router.push(`/streams/${show.id}`)}
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl opacity-0 group-hover:opacity-50 blur transition duration-500"></div>

                    <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] group-hover:border-yellow-500/50">
                      {/* Thumbnail */}
                      <div className="aspect-video bg-gradient-to-br from-yellow-900/30 via-purple-900/30 to-slate-900 relative overflow-hidden">
                        {show.coverImageUrl ? (
                          <img src={show.coverImageUrl} alt={show.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Ticket className="w-16 h-16 text-yellow-400/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60"></div>

                        {/* Scheduled Badge */}
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-purple-500/80 backdrop-blur-sm rounded-lg text-white text-xs font-bold">
                          {formatStartTime(show.scheduledStart)}
                        </div>

                        {/* Price Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg text-black text-xs font-bold flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {show.ticketPrice}
                        </div>

                        {/* Tickets Sold */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs">
                          <Ticket className="w-3.5 h-3.5" />
                          {show.ticketsSold}{show.maxTickets && `/${show.maxTickets}`}
                        </div>
                      </div>

                      {/* Show Info */}
                      <div className="p-4">
                        <h3 className="text-base font-bold text-white mb-2 line-clamp-1 group-hover:text-yellow-400 transition-colors">
                          {show.title}
                        </h3>

                        <div className="flex items-center gap-2">
                          {show.creator.avatarUrl ? (
                            <img
                              src={show.creator.avatarUrl}
                              alt={show.creator.displayName || ''}
                              className="w-6 h-6 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white">
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

        {/* Empty State */}
        {liveNow.length === 0 && upcoming.length === 0 && (
          <div className="text-center py-16">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur-2xl opacity-50"></div>
              <Tv className="relative w-24 h-24 text-white mx-auto" strokeWidth={1.5} />
            </div>
            {userRole === 'creator' ? (
              <>
                <h2 className="text-2xl font-bold text-white mb-3">No live streams right now</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                  Be the first to go live! Start streaming and connect with your fans.
                </p>
                <button
                  onClick={() => router.push('/creator/go-stream')}
                  className="px-8 py-4 rounded-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 text-white hover:scale-105 transition-all shadow-lg shadow-red-500/50 inline-flex items-center gap-2"
                >
                  <Radio className="w-5 h-5" />
                  Start Streaming
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-3">No streams available</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                  Check back soon for live streams from your favorite creators!
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
