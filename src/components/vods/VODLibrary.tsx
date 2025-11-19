'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Play, Eye, ShoppingCart, DollarSign, Clock, Trash2, Edit3 } from 'lucide-react';
import { EditVODModal } from './EditVODModal';

interface VOD {
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
  totalEarnings: number;
  createdAt: string;
}

export function VODLibrary() {
  const router = useRouter();
  const [vods, setVods] = useState<VOD[]>([]);
  const [totals, setTotals] = useState({ totalViews: 0, totalPurchases: 0, totalEarnings: 0 });
  const [loading, setLoading] = useState(true);
  const [editingVOD, setEditingVOD] = useState<VOD | null>(null);
  const [deletingVOD, setDeletingVOD] = useState<string | null>(null);

  useEffect(() => {
    fetchVODs();
  }, []);

  const fetchVODs = async () => {
    try {
      const response = await fetch('/api/vods/my-vods');
      const data = await response.json();

      if (response.ok) {
        setVods(data.vods || []);
        setTotals(data.totals || { totalViews: 0, totalPurchases: 0, totalEarnings: 0 });
      }
    } catch (error) {
      console.error('Error fetching VODs:', error);
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

  const getAccessBadge = (vod: VOD) => {
    if (vod.isPublic) {
      return <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold">Public</span>;
    }
    if (vod.subscribersOnly) {
      return <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold">Subscribers</span>;
    }
    return <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-semibold">PPV</span>;
  };

  const handleDelete = async (vodId: string) => {
    if (!confirm('Are you sure you want to delete this VOD? This action cannot be undone.')) {
      return;
    }

    setDeletingVOD(vodId);

    try {
      const response = await fetch(`/api/vods/${vodId}/edit`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete VOD');
      }

      // Refresh VODs list
      await fetchVODs();
    } catch (error) {
      console.error('Error deleting VOD:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete VOD');
    } finally {
      setDeletingVOD(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">VOD Library</h2>
          <p className="text-gray-600 mt-1">Your saved stream replays</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Total VODs</div>
          <div className="text-2xl font-bold text-digis-cyan">{vods.length}</div>
        </div>
      </div>

      {/* Totals Cards */}
      {vods.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4 border-2 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Views</div>
                <div className="text-xl font-bold text-gray-900">{totals.totalViews.toLocaleString()}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 border-2 border-cyan-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Purchases</div>
                <div className="text-xl font-bold text-gray-900">{totals.totalPurchases.toLocaleString()}</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 border-2 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Earnings</div>
                <div className="text-xl font-bold text-gray-900">{totals.totalEarnings.toLocaleString()} coins</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* VOD Grid */}
      {vods.length === 0 ? (
        <GlassCard className="p-12 text-center border-2 border-purple-200">
          <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No VODs Yet</h3>
          <p className="text-gray-600 mb-6">
            Save your stream replays to build a library of on-demand content
          </p>
          <p className="text-sm text-gray-500">
            After your next stream, click "Save Stream Replay" to create your first VOD
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vods.map((vod) => (
            <GlassCard
              key={vod.id}
              className="overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer border-2 border-purple-200 hover:border-digis-cyan"
              onClick={() => router.push(`/vod/${vod.id}`)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-purple-900 to-pink-900 overflow-hidden">
                {vod.thumbnailUrl ? (
                  <img
                    src={vod.thumbnailUrl}
                    alt={vod.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-12 h-12 text-white/50" />
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm rounded text-white text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(vod.duration)}
                </div>

                {/* Access Badge */}
                <div className="absolute top-2 left-2">
                  {getAccessBadge(vod)}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1 truncate">{vod.title}</h3>
                {vod.category && (
                  <div className="text-xs text-gray-600 mb-2">{vod.category}</div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{vod.viewCount}</span>
                  </div>
                  {vod.priceCoins > 0 && (
                    <div className="flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      <span>{vod.purchaseCount}</span>
                    </div>
                  )}
                  {vod.totalEarnings > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <DollarSign className="w-3 h-3" />
                      <span>{vod.totalEarnings}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <GlassButton
                    variant="gradient"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/vod/${vod.id}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-1"
                    shimmer
                  >
                    <Play className="w-3 h-3" />
                    <span>Watch</span>
                  </GlassButton>
                  <GlassButton
                    variant="purple"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingVOD(vod);
                    }}
                    className="flex items-center justify-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                  </GlassButton>
                  <GlassButton
                    variant="pink"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(vod.id);
                    }}
                    className="flex items-center justify-center gap-1"
                    disabled={deletingVOD === vod.id}
                  >
                    {deletingVOD === vod.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingVOD && (
        <EditVODModal
          vod={editingVOD}
          onClose={() => setEditingVOD(null)}
          onSuccess={() => {
            fetchVODs(); // Refresh VODs list
          }}
        />
      )}
    </div>
  );
}
