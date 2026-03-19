'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui';
import {
  Heart, Share2, Eye, Play,
  Volume2, VolumeX, ChevronUp, ChevronDown, Lock,
  CheckCircle, Compass, UserPlus, Coins,
  Sparkles, RefreshCw, ImageOff,
} from 'lucide-react';

interface FeedCreator {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface FeedItem {
  id: string;
  type: 'clip' | 'cloud_video' | 'cloud_photo';
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  duration: number | null;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  isLiked: boolean;
  isFree: boolean;
  priceCoins: number | null;
  createdAt: string;
  creator: FeedCreator;
}

export default function ForYouPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'clips' | 'content'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Persist mute state across all cards
  const [globalMuted, setGlobalMuted] = useState(true);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setUserId(user?.id || null);
    };
    checkAuth();
  }, []);

  // Fetch feed
  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({ limit: '20', type: filter });
      if (cursor) params.set('cursor', cursor);

      const res = await fetch(`/api/discover/feed?${params}`);
      if (!res.ok) return;

      const data = await res.json();
      if (cursor) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error('Feed fetch error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setActiveIndex(0);
    fetchFeed();
  }, [fetchFeed]);

  // Load more when reaching end
  useEffect(() => {
    if (activeIndex >= items.length - 3 && nextCursor && !loadingMore) {
      setLoadingMore(true);
      fetchFeed(nextCursor);
    }
  }, [activeIndex, items.length, nextCursor, loadingMore, fetchFeed]);

  // Scroll snap handling
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < items.length) {
      setActiveIndex(newIndex);
    }
  }, [activeIndex, items.length]);

  const scrollToIndex = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= items.length) return;

    container.scrollTo({
      top: index * container.clientHeight,
      behavior: 'smooth',
    });
  }, [items.length]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 animate-spin" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-1 rounded-full bg-black" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-500 text-sm">Loading your feed...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-10 h-10 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Nothing here yet</h2>
          <p className="text-gray-500 mb-6 text-sm">Content will show up as creators start posting</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Explore Creators
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black relative md:pl-20">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 md:pl-24 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-3">
        <div className="flex items-center justify-center">
          <div className="flex gap-0.5 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            {(['all', 'clips', 'content'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === f
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {f === 'all' ? 'For You' : f === 'clips' ? 'Clips' : 'Exclusive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed container with scroll snap */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, index) => (
          <FeedCard
            key={item.id}
            item={item}
            isActive={index === activeIndex}
            isAuthenticated={isAuthenticated}
            userId={userId}
            globalMuted={globalMuted}
            onMuteToggle={() => setGlobalMuted(m => !m)}
            onLikeToggle={(liked) => {
              setItems(prev => prev.map(i =>
                i.id === item.id
                  ? { ...i, isLiked: liked, likeCount: i.likeCount + (liked ? 1 : -1) }
                  : i
              ));
            }}
          />
        ))}

        {loadingMore && (
          <div className="h-[100dvh] snap-start flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        )}
      </div>

      {/* Navigation arrows (desktop only) */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
        <button
          onClick={() => scrollToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 disabled:opacity-20 hover:bg-white/10 transition-all"
          aria-label="Previous"
        >
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex === items.length - 1}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 disabled:opacity-20 hover:bg-white/10 transition-all"
          aria-label="Next"
        >
          <ChevronDown className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Feed Card Component ─────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem;
  isActive: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  globalMuted: boolean;
  onMuteToggle: () => void;
  onLikeToggle: (_liked: boolean) => void;
}

function FeedCard({ item, isActive, isAuthenticated, userId, globalMuted, onMuteToggle, onLikeToggle }: FeedCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const lastTapRef = useRef(0);
  const router = useRouter();

  const isVideo = item.type === 'clip' || item.type === 'cloud_video';
  const hasVideo = isVideo && item.videoUrl;
  const isPhoto = item.type === 'cloud_photo';
  const isPaid = !item.isFree && item.priceCoins;

  // Sync mute state from global
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = globalMuted;
  }, [globalMuted]);

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = globalMuted;
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
      setVideoProgress(0);
    }
  }, [isActive, globalMuted]);

  // Video progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    const handleTime = () => {
      if (video.duration) {
        setVideoProgress(video.currentTime / video.duration);
      }
    };
    video.addEventListener('timeupdate', handleTime);
    return () => video.removeEventListener('timeupdate', handleTime);
  }, [isActive]);

  const handleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    // Double tap = like
    if (timeSinceLastTap < 300) {
      handleDoubleTapLike();
      return;
    }

    // Single tap = play/pause (delayed to check for double tap)
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 280) {
        if (hasVideo) togglePlay();
      }
    }, 300);
  };

  const handleDoubleTapLike = async () => {
    if (!isAuthenticated) return;

    // Show heart animation
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);

    if (!item.isLiked) {
      handleLike();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setPlaying(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || liking) return;
    setLiking(true);

    try {
      // Clips use /api/clips/:id/like, cloud items use /api/cloud/items/:id/like
      const endpoint = item.type === 'clip'
        ? `/api/clips/${item.id}/like`
        : `/api/cloud/items/${item.id}/like`;

      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onLikeToggle(data.liked);
      }
    } catch {
      // ignore
    } finally {
      setLiking(false);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || following) return;
    setFollowing(true);

    try {
      const res = await fetch(`/api/follow/${item.creator.id}`, {
        method: 'POST',
      });
      if (res.ok) {
        setIsFollowing(true);
      }
    } catch {
      // ignore
    } finally {
      setFollowing(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = item.type === 'clip'
      ? `https://digis.cc/clip/${item.id}`
      : `https://digis.cc/${item.creator.username}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title || `${item.creator.displayName || item.creator.username} on Digis`,
          url,
        });
        if (item.type === 'clip') {
          fetch(`/api/clips/${item.id}/share`, { method: 'POST' }).catch(() => {});
        }
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  // Record view when clip becomes active
  useEffect(() => {
    if (isActive && item.type === 'clip') {
      fetch(`/api/clips/${item.id}`, { method: 'GET' }).catch(() => {});
    }
  }, [isActive, item.id, item.type]);

  const isOwnContent = userId === item.creator.id;

  return (
    <div className="h-[100dvh] snap-start relative bg-black overflow-hidden">
      {/* Blurred background fill — eliminates black bars */}
      {item.thumbnailUrl && (
        <div className="absolute inset-0 scale-[1.4]" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl opacity-40 brightness-75"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main media */}
      {hasVideo ? (
        <div className="absolute inset-0 flex items-center justify-center" onClick={handleTap}>
          {!videoError ? (
            <video
              ref={videoRef}
              src={item.videoUrl!}
              poster={item.thumbnailUrl || undefined}
              loop
              muted={globalMuted}
              playsInline
              preload={isActive ? 'auto' : 'none'}
              className="w-full h-full object-cover"
              onError={() => setVideoError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-white/10">
                <ImageOff className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">Video failed to load</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoError(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          )}

          {/* Pause icon (shows briefly on pause) */}
          {!playing && !videoError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-5 rounded-full bg-black/30 backdrop-blur-sm animate-fade-in">
                <Play className="w-14 h-14 text-white/90 fill-white/90 ml-1" />
              </div>
            </div>
          )}

          {/* Double-tap heart animation */}
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-heart-burst" />
            </div>
          )}
        </div>
      ) : (
        // Photo or cloud video preview (no playable video URL in feed)
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            // Double-tap to like on photos too
            const now = Date.now();
            const timeSinceLastTap = now - lastTapRef.current;
            lastTapRef.current = now;
            if (timeSinceLastTap < 300) {
              handleDoubleTapLike();
              return;
            }
            setTimeout(() => {
              if (Date.now() - lastTapRef.current >= 280) {
                router.push(`/${item.creator.username}`);
              }
            }, 300);
          }}
        >
          {item.thumbnailUrl ? (
            <>
              {/* Loading shimmer */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gray-900 animate-pulse" />
              )}
              <Image
                src={item.thumbnailUrl}
                alt={item.title || 'Content'}
                fill
                className={`transition-opacity duration-300 ${
                  isPhoto ? 'object-contain' : 'object-cover'
                } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                priority={isActive}
                unoptimized
                onLoad={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="w-full h-full bg-gray-900/50 flex items-center justify-center">
              <p className="text-gray-600">No preview</p>
            </div>
          )}

          {/* Cloud video indicator (has no playable URL in feed) */}
          {item.type === 'cloud_video' && !isPaid && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-4 rounded-full bg-black/40 backdrop-blur-sm">
                <Play className="w-10 h-10 text-white/80 fill-white/80 ml-0.5" />
              </div>
            </div>
          )}

          {/* Double-tap heart animation for photos */}
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-heart-burst" />
            </div>
          )}

          {/* PPV locked overlay */}
          {isPaid && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 backdrop-blur-md flex items-center justify-center rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500/30 to-purple-500/30 border border-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-bold text-lg mb-0.5">Exclusive Content</p>
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">{item.priceCoins}</span>
                  <span className="text-gray-400 text-sm">coins</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/${item.creator.username}`);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
                >
                  View Profile
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top gradient for header */}
      <div className="absolute top-0 left-0 md:left-20 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Creator info (bottom left) */}
      <div className="absolute bottom-20 left-4 md:left-24 right-20 z-10">
        <div className="flex items-center gap-2.5 mb-3">
          <Link href={`/${item.creator.username}`} className="shrink-0">
            {item.creator.avatarUrl ? (
              <Image
                src={item.creator.avatarUrl}
                alt={item.creator.displayName || item.creator.username || ''}
                width={44}
                height={44}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white/20"
                unoptimized
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 ring-2 ring-white/20" />
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/${item.creator.username}`} className="flex items-center gap-1">
              <span className="text-white font-bold text-sm truncate">
                {item.creator.displayName || `@${item.creator.username}`}
              </span>
              {item.creator.isVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20 shrink-0" />
              )}
            </Link>
            <span className="text-gray-400 text-xs">@{item.creator.username}</span>
          </div>
          {/* Follow button */}
          {!isOwnContent && !isFollowing && (
            <button
              onClick={handleFollow}
              disabled={following}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-full text-white text-xs font-bold transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Follow
            </button>
          )}
        </div>

        {item.title && (
          <p className="text-white text-sm font-medium mb-1 line-clamp-2 drop-shadow-lg">
            {item.title}
          </p>
        )}
        {item.description && (
          <p className="text-gray-300 text-xs line-clamp-2 drop-shadow-lg">
            {item.description}
          </p>
        )}
      </div>

      {/* Action buttons (right side) — TikTok-style vertical stack */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10">
        {/* Like */}
        <button
          onClick={(e) => { e.stopPropagation(); handleLike(); }}
          className="flex flex-col items-center gap-0.5 group"
          aria-label={item.isLiked ? 'Unlike' : 'Like'}
        >
          <div className={`p-2.5 rounded-full transition-all ${
            item.isLiked
              ? 'bg-red-500/20 scale-110'
              : 'bg-white/10 group-hover:bg-white/20'
          }`}>
            <Heart className={`w-7 h-7 transition-all ${
              item.isLiked ? 'text-red-500 fill-red-500' : 'text-white drop-shadow-lg'
            }`} />
          </div>
          <span className="text-white text-[11px] font-bold drop-shadow-lg">
            {formatCount(item.likeCount)}
          </span>
        </button>

        {/* Views (clips only) */}
        {item.type === 'clip' && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="p-2.5 rounded-full bg-white/10">
              <Eye className="w-7 h-7 text-white drop-shadow-lg" />
            </div>
            <span className="text-white text-[11px] font-bold drop-shadow-lg">
              {formatCount(item.viewCount)}
            </span>
          </div>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-0.5 group"
          aria-label="Share"
        >
          <div className="p-2.5 rounded-full bg-white/10 group-hover:bg-white/20 transition-all">
            <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
          </div>
          <span className="text-white text-[11px] font-bold drop-shadow-lg">Share</span>
        </button>

        {/* Mute/unmute (video only) */}
        {hasVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            aria-label={globalMuted ? 'Unmute' : 'Mute'}
          >
            {globalMuted ? (
              <VolumeX className="w-5 h-5 text-white drop-shadow-lg" />
            ) : (
              <Volume2 className="w-5 h-5 text-white drop-shadow-lg" />
            )}
          </button>
        )}
      </div>

      {/* Video progress bar */}
      {hasVideo && !videoError && (
        <div className="absolute bottom-[72px] left-0 right-0 z-10 px-0">
          <div className="h-[3px] bg-white/20">
            <div
              className="h-full bg-white/80 transition-[width] duration-200"
              style={{ width: `${videoProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Heart burst + fade-in animation styles */}
      <style jsx>{`
        @keyframes heart-burst {
          0% { transform: scale(0); opacity: 0; }
          15% { transform: scale(1.3); opacity: 1; }
          30% { transform: scale(0.95); opacity: 1; }
          45% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        :global(.animate-heart-burst) {
          animation: heart-burst 0.8s ease-out forwards;
        }
        :global(.animate-fade-in) {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
