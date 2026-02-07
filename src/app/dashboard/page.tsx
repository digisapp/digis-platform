'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Clock, Users, Eye, Play, Image as ImageIcon, Lock } from 'lucide-react';
import { getCategoryLabel, getCategoryColor } from '@/lib/constants/categories';

interface Creator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface LiveStream {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  status: string;
  creator: Creator;
}

interface DiscoverLiveStream {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  status: string;
  category: string | null;
  creator: Creator & { primaryCategory?: string | null };
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
  creator: Creator;
}

interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  thumbnailUrl: string | null;
  price: number;
  isFree: boolean;
  createdAt: string;
  creator: Creator;
}

interface SuggestedCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  isLive: boolean;
  isOnline: boolean;
  primaryCategory: string | null;
  isCreatorVerified: boolean;
}

export default function FanDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, isCreator } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [liveFromFollowing, setLiveFromFollowing] = useState<LiveStream[]>([]);
  const [discoverLive, setDiscoverLive] = useState<DiscoverLiveStream[]>([]);
  const [upcomingFromFollowing, setUpcomingFromFollowing] = useState<UpcomingShow[]>([]);
  const [recentContent, setRecentContent] = useState<ContentItem[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);

  // Redirect to homepage when user signs out
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    // Check if user needs to set their username
    try {
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const username = profileData.user?.username;

        // Redirect to username setup if they have no username or an auto-generated one
        if (!username || username.startsWith('user_')) {
          router.push('/welcome/username');
          return;
        }
      }
    } catch (err) {
      console.error('Error checking username:', err);
    }

    // Fetch personalized feed
    await fetchFeed();
    setLoading(false);
  };

  const fetchFeed = async () => {
    try {
      const res = await fetch('/api/feed');
      if (res.ok) {
        const data = await res.json();
        setIsNewUser(data.isNewUser);
        setFollowingCount(data.followingCount);
        setLiveFromFollowing(data.liveFromFollowing || []);
        setDiscoverLive(data.discoverLive || []);
        setUpcomingFromFollowing(data.upcomingFromFollowing || []);
        setRecentContent(data.recentContent || []);
        setSuggestedCreators(data.suggestedCreators || []);
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
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

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      <div className="container max-w-7xl mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 relative z-10">
        {/* New User Welcome / Empty State */}
        {isNewUser && (
          <div className="mb-8 backdrop-blur-2xl bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl border-2 border-cyan-500/30 p-8 text-center shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            <div className="text-5xl mb-4">{isCreator ? '🎬' : '👋'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isCreator ? 'Welcome, Creator!' : 'Welcome to Digis!'}
            </h2>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              {isCreator
                ? 'Your creator dashboard is ready. Go live, upload content, or set up your profile to start earning.'
                : 'Start by following some creators to personalize your feed. We\'ll show you their live streams, new content, and upcoming streams right here.'}
            </p>
            {isCreator ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/stream')}
                  className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
                >
                  Go Live
                </button>
                <button
                  onClick={() => router.push('/creator/content')}
                  className="px-8 py-3 bg-white/10 border border-white/20 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                >
                  Upload Content
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/explore')}
                className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
              >
                Explore Creators
              </button>
            )}
          </div>
        )}

        {/* Live Now from Following */}
        {liveFromFollowing.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-red-500 rounded-full blur opacity-75"></div>
                  <div className="relative w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
                </div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Live Now</h2>
                <span className="text-xs text-gray-400">from creators you follow</span>
              </div>
              <button
                onClick={() => router.push('/watch')}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveFromFollowing.map((stream) => (
                <div
                  key={stream.id}
                  onClick={() => router.push(`/live/${stream.creator.username}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 mb-3 border-2 border-red-500/30 hover:border-red-500/60 transition-all">
                    {stream.thumbnailUrl ? (
                      <Image
                        src={stream.thumbnailUrl}
                        alt={stream.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
                        <Play className="w-12 h-12 text-red-400" />
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
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0 ring-2 ring-red-500">
                      {stream.creator.avatarUrl ? (
                        <Image src={stream.creator.avatarUrl} alt={stream.creator.username} fill className="rounded-full object-cover" unoptimized />
                      ) : (
                        <span className="text-white font-bold text-sm">{stream.creator.username?.[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1">{stream.title}</h3>
                      <p className="text-gray-400 text-xs line-clamp-1">{stream.creator.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discover Live section removed - live creators now shown via "LIVE" badges in Suggested For You section */}

        {/* Recent Content from Following */}
        {recentContent.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">New Content</h2>
                <span className="text-xs text-gray-400">from creators you follow</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recentContent.map((content) => (
                <div
                  key={content.id}
                  onClick={() => router.push(`/content/${content.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-900 mb-2 border border-white/10 hover:border-cyan-500/50 transition-all">
                    {content.thumbnailUrl ? (
                      <Image
                        src={content.thumbnailUrl}
                        alt={content.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}

                    {/* Content type badge */}
                    <div className="absolute top-2 left-2">
                      {content.contentType === 'video' && (
                        <div className="bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                          <Play className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Price badge */}
                    {!content.isFree && (
                      <div className="absolute top-2 right-2 bg-yellow-500/90 text-gray-900 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {content.price}
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Creator avatar */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                      <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                        {content.creator.avatarUrl ? (
                          <Image src={content.creator.avatarUrl} alt={content.creator.username} fill className="rounded-full object-cover" unoptimized />
                        ) : (
                          <span className="text-white text-xs font-bold">{content.creator.username?.[0]?.toUpperCase() || '?'}</span>
                        )}
                      </div>
                      <span className="text-white text-xs font-medium truncate max-w-[80px]">{content.creator.username}</span>
                    </div>
                  </div>

                  <div className="px-1">
                    <p className="text-gray-400 text-xs">{formatTimeAgo(content.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Shows from Following */}
        {upcomingFromFollowing.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Upcoming Streams</h2>
                <span className="text-xs text-gray-400">from creators you follow</span>
              </div>
              <button
                onClick={() => router.push('/watch')}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                View all →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingFromFollowing.map((show) => (
                <div
                  key={show.id}
                  onClick={() => router.push(`/streams/${show.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 overflow-hidden hover:border-cyan-500/50 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    {/* Cover Image */}
                    <div className="relative aspect-video bg-slate-900">
                      {show.coverImageUrl ? (
                        <Image src={show.coverImageUrl} alt={show.title} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                          <span className="text-4xl">🎟️</span>
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
                        <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                          {show.creator.avatarUrl ? (
                            <Image src={show.creator.avatarUrl} alt={show.creator.username} fill className="rounded-full object-cover" unoptimized />
                          ) : (
                            <span className="text-white text-xs font-bold">{show.creator.username?.[0]?.toUpperCase() || '?'}</span>
                          )}
                        </div>
                        <span className="text-gray-400 text-sm">{show.creator.username}</span>
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

        {/* Suggested Creators */}
        {suggestedCreators.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">Suggested For You</h2>
              </div>
              <button
                onClick={() => router.push('/explore')}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
              >
                Explore all →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {suggestedCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => router.push(`/${creator.username}`)}
                  className="overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] group relative rounded-2xl border-2 border-purple-500/30 hover:border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                >
                  {/* 4:5 Portrait Card */}
                  <div className="relative w-full overflow-hidden rounded-2xl" style={{paddingBottom: '125%'}}>
                    {creator.avatarUrl ? (
                      <>
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.username}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <Users className="w-16 h-16 text-purple-400" />
                      </div>
                    )}

                    {/* Live indicator */}
                    {creator.isLive && (
                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 z-10">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    )}

                    {/* Online indicator */}
                    {creator.isOnline && !creator.isLive && (
                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-green-500/80 text-white text-xs font-medium z-10">
                        Online
                      </div>
                    )}

                    {/* Category badge */}
                    {creator.primaryCategory && (
                      <div className={`absolute ${creator.isLive || creator.isOnline ? 'top-10' : 'top-2'} left-2 px-2 py-0.5 rounded-md bg-gradient-to-r ${getCategoryColor(creator.primaryCategory)} text-white text-[10px] font-bold backdrop-blur-sm shadow-lg z-10`}>
                        {getCategoryLabel(creator.primaryCategory)}
                      </div>
                    )}

                    {/* Creator info overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-sm bg-white/10 border-t border-purple-500/30 group-hover:bg-white/20 transition-all duration-300">
                      <h3 className="text-sm font-bold text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {creator.username}
                      </h3>
                      <p className="text-xs text-gray-300">{creator.followerCount.toLocaleString()} followers</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for returning users with no activity */}
        {!isNewUser && liveFromFollowing.length === 0 && recentContent.length === 0 && upcomingFromFollowing.length === 0 && (
          <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl border-2 border-cyan-500/30 p-12 text-center shadow-[0_0_50px_rgba(34,211,238,0.3)]">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-3">
              {isCreator ? 'Your Dashboard' : 'No New Activity'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {isCreator
                ? 'Ready to create? Go live, upload new content, or check your earnings.'
                : 'The creators you follow haven\'t posted anything new recently. Check back later or discover new creators!'}
            </p>
            <div className="flex gap-4 justify-center">
              {isCreator ? (
                <>
                  <button
                    onClick={() => router.push('/stream')}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    Go Live
                  </button>
                  <button
                    onClick={() => router.push('/creator/content')}
                    className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                  >
                    Upload Content
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/explore')}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    Explore Creators
                  </button>
                  <button
                    onClick={() => router.push('/watch')}
                    className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                  >
                    See Who's Live
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
