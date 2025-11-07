'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Lock, Play, Image as ImageIcon, Eye, ShoppingCart } from 'lucide-react';

interface Content {
  id: string;
  title: string;
  description: string | null;
  contentType: 'photo' | 'video' | 'gallery';
  unlockPrice: number;
  isFree: boolean;
  thumbnailUrl: string;
  mediaUrl: string;
  viewCount: number;
  purchaseCount: number;
  durationSeconds: number | null;
  createdAt: string;
  hasAccess: boolean;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isCreatorVerified: boolean;
  };
}

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.contentId as string;

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContent();
  }, [contentId]);

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${contentId}`);
      const data = await response.json();

      if (response.ok) {
        setContent(data.content);
      } else {
        setError(data.error || 'Failed to load content');
      }
    } catch (err) {
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!content) return;

    setPurchasing(true);
    setError('');

    try {
      const response = await fetch(`/api/content/${contentId}/purchase`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh content to show unlocked
        await fetchContent();
        alert('Content unlocked successfully!');
      } else {
        setError(data.error || 'Failed to purchase content');
      }
    } catch (err) {
      setError('Failed to purchase content');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <GlassCard className="p-8 text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <GlassButton onClick={() => router.back()}>Go Back</GlassButton>
        </GlassCard>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Media Display */}
          <div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="relative aspect-[3/4] bg-black">
                {content.hasAccess ? (
                  // Show full content if user has access
                  content.contentType === 'video' ? (
                    <video
                      src={content.mediaUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={content.mediaUrl}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  // Show blurred preview if locked
                  <>
                    <img
                      src={content.thumbnailUrl}
                      alt={content.title}
                      className="w-full h-full object-cover blur-xl scale-110"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="text-center">
                        <Lock className="w-20 h-20 text-white mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">
                          Content Locked
                        </h3>
                        <p className="text-gray-300 text-lg">
                          {content.isFree
                            ? 'Free to unlock'
                            : `Unlock for ${content.unlockPrice} coins`}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Content Type Badge */}
                {!content.hasAccess && (
                  <div className="absolute top-4 left-4">
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-white">
                      {content.contentType === 'video' ? (
                        <Play className="w-5 h-5" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                      <span className="capitalize">{content.contentType}</span>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right: Content Info */}
          <div className="space-y-6">
            {/* Creator Info */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center">
                  {content.creator.avatarUrl ? (
                    <img
                      src={content.creator.avatarUrl}
                      alt={content.creator.displayName || content.creator.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {(content.creator.displayName || content.creator.username)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {content.creator.displayName || content.creator.username}
                    </h3>
                    {content.creator.isCreatorVerified && (
                      <span className="text-digis-cyan text-xl">✓</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">@{content.creator.username}</p>
                </div>
              </div>
            </GlassCard>

            {/* Content Details */}
            <GlassCard className="p-6">
              <h1 className="text-3xl font-bold text-white mb-4">{content.title}</h1>

              {content.description && (
                <p className="text-gray-300 mb-6 leading-relaxed">{content.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">Views</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{content.viewCount}</p>
                </div>

                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="text-sm">Purchases</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{content.purchaseCount}</p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
                  {error}
                </div>
              )}

              {/* Purchase Button */}
              {!content.hasAccess && (
                <GlassButton
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  onClick={handlePurchase}
                  disabled={purchasing}
                  shimmer
                >
                  {purchasing ? (
                    <LoadingSpinner size="sm" />
                  ) : content.isFree ? (
                    'Unlock for Free'
                  ) : (
                    `Unlock for ${content.unlockPrice} coins`
                  )}
                </GlassButton>
              )}

              {content.hasAccess && (
                <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 text-center">
                  <p className="text-green-300 font-semibold">✓ You own this content</p>
                </div>
              )}
            </GlassCard>

            {/* Back Button */}
            <GlassButton
              variant="ghost"
              size="md"
              className="w-full"
              onClick={() => router.back()}
            >
              ← Back to Content
            </GlassButton>
          </div>
        </div>
      </div>
    </div>
  );
}
