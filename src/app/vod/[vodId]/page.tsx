'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VODAccessModal } from '@/components/vods/VODAccessModal';
import { EditVODModal } from '@/components/vods/EditVODModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { GlassButton } from '@/components/ui/GlassButton';
import { Play, Users, Eye, Clock, TrendingUp, Edit3 } from 'lucide-react';

interface VODData {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  duration: number;
  viewCount: number;
  purchaseCount: number;
  priceCoins: number;
  isPublic: boolean;
  subscribersOnly: boolean;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isCreatorVerified: boolean;
  };
  originalViewers: number;
  originalPeakViewers: number;
  originalEarnings: number;
  createdAt: string;
}

interface AccessInfo {
  hasAccess: boolean;
  reason?: string;
  requiresPurchase?: boolean;
  price?: number;
}

export default function VODPlayerPage() {
  const params = useParams() as { vodId: string };
  const router = useRouter();
  const vodId = params.vodId;

  const [vod, setVod] = useState<VODData | null>(null);
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    fetchVOD();
  }, [vodId]);

  const fetchVOD = async () => {
    try {
      const response = await fetch(`/api/vods/${vodId}`);
      const data = await response.json();

      if (response.ok) {
        setVod(data.vod);
        setAccess(data.access);
        setIsCreator(data.isCreator || false);

        // Show access modal if purchase required
        if (data.access.requiresPurchase && !data.access.hasAccess) {
          setShowAccessModal(true);
        }
      } else {
        setError(data.error || 'VOD not found');
      }
    } catch (err) {
      setError('Failed to load VOD');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !vod) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">{error || 'VOD not found'}</h1>
          <GlassButton variant="cyan" onClick={() => router.push('/explore')}>
            Back to Explore
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black md:pl-20">
      <div className="container mx-auto px-4 pt-0 md:pt-10 pb-20 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            <div className="relative bg-black rounded-2xl overflow-hidden border-2 border-white/10 aspect-video">
              {access?.hasAccess ? (
                <>
                  {vod.videoUrl ? (
                    <video
                      controls
                      className="w-full h-full"
                      poster={vod.thumbnailUrl || undefined}
                    >
                      <source src={vod.videoUrl} type="video/mp4" />
                      Your browser does not support video playback.
                    </video>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                      <Play className="w-20 h-20 text-white/50 mb-4" />
                      <p className="text-white text-center mb-2">Video is being processed</p>
                      <p className="text-gray-400 text-sm text-center">
                        This VOD will be available for playback soon. Check back in a few minutes.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm">
                  {vod.thumbnailUrl && (
                    <img
                      src={vod.thumbnailUrl}
                      alt={vod.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                      <Play className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-white text-xl font-bold mb-2">
                      {access?.reason || 'Access Required'}
                    </p>
                    <button
                      onClick={() => setShowAccessModal(true)}
                      className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg"
                    >
                      {vod.priceCoins === 0 ? 'Subscribe to Watch' : `Purchase for ${vod.priceCoins} coins`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* VOD Info */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-2xl font-bold text-white flex-1">{vod.title}</h1>
                {isCreator && (
                  <GlassButton
                    variant="purple"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </GlassButton>
                )}
              </div>
              {vod.description && (
                <p className="text-gray-400 mb-4">{vod.description}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{vod.viewCount} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(vod.duration)}</span>
                </div>
                {vod.category && (
                  <div className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-300 text-xs font-semibold">
                    {vod.category}
                  </div>
                )}
              </div>
            </div>

            {/* Creator Info */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {vod.creator.avatarUrl ? (
                    <img
                      src={vod.creator.avatarUrl}
                      alt={vod.creator.displayName || vod.creator.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-white font-bold">
                      {(vod.creator.displayName || vod.creator.username)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {vod.creator.displayName || vod.creator.username}
                      </span>
                      {vod.creator.isCreatorVerified && (
                        <span className="text-blue-400">✓</span>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/${vod.creator.username}`)}
                      className="text-sm text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                      @{vod.creator.username}
                    </button>
                  </div>
                </div>

                <GlassButton
                  variant="gradient"
                  size="md"
                  onClick={() => router.push(`/${vod.creator.username}`)}
                  shimmer
                >
                  View Profile
                </GlassButton>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Original Stream Stats */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Original Stream Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Viewers</span>
                  <span className="text-white font-bold">{vod.originalViewers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Peak Viewers</span>
                  <span className="text-cyan-400 font-bold">{vod.originalPeakViewers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Gifts Received</span>
                  <span className="text-yellow-400 font-bold">{vod.originalEarnings} coins</span>
                </div>
              </div>
            </div>

            {/* VOD Stats */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Replay Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Replay Views</span>
                  <span className="text-white font-bold">{vod.viewCount}</span>
                </div>
                {vod.priceCoins > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Purchases</span>
                    <span className="text-green-400 font-bold">{vod.purchaseCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Access Modal */}
      {showAccessModal && access?.requiresPurchase && (
        <VODAccessModal
          vodId={vodId}
          vodTitle={vod.title}
          creatorName={vod.creator.displayName || vod.creator.username}
          price={vod.priceCoins}
          isSubscriberOnly={vod.subscribersOnly}
          onClose={() => setShowAccessModal(false)}
          onSuccess={() => {
            fetchVOD(); // Refresh to get updated access
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && vod && (
        <EditVODModal
          vod={{
            id: vod.id,
            title: vod.title,
            description: vod.description,
            priceCoins: vod.priceCoins,
            isPublic: vod.isPublic,
            subscribersOnly: vod.subscribersOnly,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchVOD(); // Refresh to get updated VOD data
          }}
        />
      )}
    </div>
  );
}
