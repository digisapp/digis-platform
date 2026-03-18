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
  CheckCircle, ArrowLeft, Compass,
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

export default function DiscoverPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'clips' | 'content'>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
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
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-400">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <Compass className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No content yet</h2>
          <p className="text-gray-400 mb-6">Be the first to discover content when creators start posting</p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold"
          >
            Explore Creators
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black relative">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex gap-1 bg-black/30 backdrop-blur-sm rounded-full p-1">
            {(['all', 'clips', 'content'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {f === 'all' ? 'For You' : f === 'clips' ? 'Clips' : 'Content'}
              </button>
            ))}
          </div>

          <div className="w-9" /> {/* Spacer for centering */}
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
          className="p-2 rounded-full bg-black/30 backdrop-blur-sm disabled:opacity-30 hover:bg-black/50 transition-colors"
          aria-label="Previous clip"
        >
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scrollToIndex(activeIndex + 1)}
          disabled={activeIndex === items.length - 1}
          className="p-2 rounded-full bg-black/30 backdrop-blur-sm disabled:opacity-30 hover:bg-black/50 transition-colors"
          aria-label="Next clip"
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
  onLikeToggle: (_liked: boolean) => void;
}

function FeedCard({ item, isActive, isAuthenticated, onLikeToggle }: FeedCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [liking, setLiking] = useState(false);
  const router = useRouter();

  const isVideo = item.type === 'clip' || item.type === 'cloud_video';
  const hasVideo = isVideo && item.videoUrl;

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

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

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleLike = async () => {
    if (!isAuthenticated || liking || item.type !== 'clip') return;
    setLiking(true);

    try {
      const res = await fetch(`/api/clips/${item.id}/like`, { method: 'POST' });
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

  const handleShare = async () => {
    const url = item.type === 'clip'
      ? `https://digis.cc/clip/${item.id}`
      : `https://digis.cc/${item.creator.username}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title || `${item.creator.displayName || item.creator.username} on Digis`,
          url,
        });
        // Track share
        if (item.type === 'clip') {
          fetch(`/api/clips/${item.id}/share`, { method: 'POST' }).catch(() => {});
        }
      } catch {
        // User cancelled share
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

  return (
    <div className="h-[100dvh] snap-start relative bg-black flex items-center justify-center">
      {/* Media */}
      {hasVideo ? (
        <div className="absolute inset-0" onClick={togglePlay}>
          <video
            ref={videoRef}
            src={item.videoUrl!}
            poster={item.thumbnailUrl || undefined}
            loop
            muted={muted}
            playsInline
            preload={isActive ? 'auto' : 'none'}
            className="w-full h-full object-contain"
          />

          {/* Play/pause overlay */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="p-4 rounded-full bg-black/40 backdrop-blur-sm">
                <Play className="w-12 h-12 text-white fill-white" />
              </div>
            </div>
          )}
        </div>
      ) : (
        // Photo content
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => router.push(`/${item.creator.username}`)}
        >
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.title || 'Content'}
              fill
              className="object-contain"
              priority={isActive}
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <p className="text-gray-500">No preview</p>
            </div>
          )}

          {/* Paid content overlay */}
          {!item.isFree && item.priceCoins && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-center">
                <Lock className="w-10 h-10 text-white mx-auto mb-2" />
                <p className="text-white font-bold text-lg">{item.priceCoins} coins</p>
                <p className="text-gray-300 text-sm">Tap to unlock</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Creator info (bottom left) */}
      <div className="absolute bottom-20 left-4 right-16 z-10">
        <Link
          href={`/${item.creator.username}`}
          className="flex items-center gap-2 mb-3"
        >
          {item.creator.avatarUrl ? (
            <Image
              src={item.creator.avatarUrl}
              alt={item.creator.displayName || item.creator.username || ''}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white/30" />
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold text-sm">
                @{item.creator.username}
              </span>
              {item.creator.isVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
              )}
            </div>
            {item.creator.displayName && (
              <span className="text-gray-300 text-xs">{item.creator.displayName}</span>
            )}
          </div>
        </Link>

        {item.title && (
          <p className="text-white text-sm font-medium mb-1 line-clamp-2">
            {item.title}
          </p>
        )}
        {item.description && (
          <p className="text-gray-300 text-xs line-clamp-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Action buttons (right side) */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          aria-label={item.isLiked ? 'Unlike' : 'Like'}
        >
          <div className={`p-2.5 rounded-full backdrop-blur-sm ${
            item.isLiked ? 'bg-red-500/30' : 'bg-black/30'
          }`}>
            <Heart className={`w-6 h-6 ${
              item.isLiked ? 'text-red-500 fill-red-500' : 'text-white'
            }`} />
          </div>
          <span className="text-white text-xs font-semibold">
            {formatCount(item.likeCount)}
          </span>
        </button>

        {/* Views (clips only) */}
        {item.type === 'clip' && (
          <div className="flex flex-col items-center gap-1">
            <div className="p-2.5 rounded-full bg-black/30 backdrop-blur-sm">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs font-semibold">
              {formatCount(item.viewCount)}
            </span>
          </div>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <div className="p-2.5 rounded-full bg-black/30 backdrop-blur-sm">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">Share</span>
        </button>

        {/* Mute/unmute (video only) */}
        {hasVideo && (
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full bg-black/30 backdrop-blur-sm"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeX className="w-5 h-5 text-white" />
            ) : (
              <Volume2 className="w-5 h-5 text-white" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}
