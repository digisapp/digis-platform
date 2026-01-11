'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GlassButton } from '@/components/ui/GlassButton';
import { Play, Heart, Eye, Share2, ArrowLeft, CheckCircle, Scissors } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface ClipData {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  vod?: {
    id: string;
    title: string;
    priceCoins: number;
  };
}

export default function ClipPlayerPageClient() {
  const params = useParams() as { clipId: string };
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const clipId = params.clipId;

  const [clip, setClip] = useState<ClipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchClip();
    checkAuth();
  }, [clipId]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);

    // Check if user has liked this clip
    if (user) {
      checkLikeStatus();
    }
  };

  const fetchClip = async () => {
    try {
      const response = await fetch(`/api/clips/${clipId}`);
      const data = await response.json();

      if (response.ok) {
        setClip(data.clip);
        setLikeCount(data.clip.likeCount || 0);
      } else {
        setError(data.error || 'Clip not found');
      }
    } catch (err) {
      setError('Failed to load clip');
    } finally {
      setLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    try {
      const response = await fetch(`/api/clips/${clipId}/like`);
      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
      }
    } catch (err) {
      console.error('Error checking like status:', err);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      showError('Sign in to like clips');
      return;
    }

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      const response = await fetch(`/api/clips/${clipId}/like`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        showError('Failed to update like');
      }
    } catch (err) {
      // Revert on error
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      showError('Failed to update like');
    }
  };

  const handleShare = async () => {
    const clipUrl = `${window.location.origin}/clip/${clipId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: clip?.title || 'Check out this clip',
          url: clipUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(clipUrl);
      showSuccess('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'Clip not found'}</h1>
          <GlassButton variant="cyan" onClick={() => router.push('/explore')}>
            Back to Explore
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black md:pl-20 pb-20 md:pb-0">
      <div className="container mx-auto px-4 pt-4 md:pt-10">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player - Vertical format for clips */}
            <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-green-500/30 max-w-md mx-auto aspect-[9/16]">
              {clip.videoUrl ? (
                <video
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                  poster={clip.thumbnailUrl || undefined}
                >
                  <source src={clip.videoUrl} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-900/50 to-cyan-900/50">
                  {clip.thumbnailUrl && (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-50"
                    />
                  )}
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                      <Scissors className="w-10 h-10 text-green-400" />
                    </div>
                    <p className="text-white text-xl font-bold mb-2">Clip Processing</p>
                    <p className="text-gray-400 text-sm">
                      This clip will be available for playback soon.
                    </p>
                  </div>
                </div>
              )}

              {/* FREE Badge */}
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-bold rounded-lg shadow-lg">
                FREE CLIP
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  isLiked
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
                <span>{likeCount}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Clip Info */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 max-w-md mx-auto lg:max-w-none">
              <h1 className="text-xl font-bold text-white mb-2">{clip.title}</h1>
              {clip.description && (
                <p className="text-gray-400 mb-4 text-sm">{clip.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{clip.viewCount} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>{likeCount} likes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Creator Info */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {clip.creator.avatarUrl ? (
                    <img
                      src={clip.creator.avatarUrl}
                      alt={clip.creator.displayName || clip.creator.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold">
                      {(clip.creator.displayName || clip.creator.username)?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {clip.creator.displayName || clip.creator.username}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/${clip.creator.username}`)}
                      className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      @{clip.creator.username}
                    </button>
                  </div>
                </div>
              </div>

              <GlassButton
                variant="gradient"
                onClick={() => router.push(`/${clip.creator.username}`)}
                className="w-full mt-4"
                shimmer
              >
                View Profile
              </GlassButton>
            </div>

            {/* Source VOD promotion */}
            {clip.vod && (
              <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-md rounded-2xl border border-purple-500/30 p-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Play className="w-5 h-5 text-purple-400" />
                  Watch the Full Stream
                </h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {clip.vod.title}
                </p>
                {clip.vod.priceCoins > 0 && (
                  <p className="text-yellow-400 font-bold text-sm mb-4">
                    {clip.vod.priceCoins} coins
                  </p>
                )}
                <GlassButton
                  variant="purple"
                  onClick={() => router.push(`/vod/${clip.vod!.id}`)}
                  className="w-full"
                >
                  Watch VOD
                </GlassButton>
              </div>
            )}

            {/* Info about clips */}
            <div className="bg-gradient-to-br from-green-900/20 to-cyan-900/20 backdrop-blur-md rounded-2xl border border-green-500/20 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Scissors className="w-5 h-5 text-green-400" />
                <h3 className="text-md font-bold text-white">About Clips</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Clips are free 30-second highlights from streams. Enjoy and share with friends!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
