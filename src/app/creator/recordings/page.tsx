'use client';

import { useEffect, useState } from 'react';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { Eye, Trash2, Coins, ShoppingCart, Heart, Play, Film, Scissors } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
import { EditVODModal } from '@/components/vods/EditVODModal';
import Link from 'next/link';

interface VOD {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number;
  priceCoins: number;
  isPublic: boolean;
  subscribersOnly: boolean;
  viewCount: number;
  purchaseCount: number;
  totalEarnings: number;
  isDraft?: boolean;
  createdAt: string;
}

interface Clip {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdAt: string;
}

type Tab = 'vods' | 'clips';

export default function CreatorRecordingsPage() {
  const { showError } = useToastContext();
  const [activeTab, setActiveTab] = useState<Tab>('vods');
  const [vods, setVods] = useState<VOD[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editVod, setEditVod] = useState<VOD | null>(null);
  const [vodTotals, setVodTotals] = useState({ totalViews: 0, totalPurchases: 0, totalEarnings: 0 });
  const [clipTotals, setClipTotals] = useState({ totalViews: 0, totalLikes: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vodRes, clipRes] = await Promise.all([
        fetch('/api/vods/my-vods'),
        fetch('/api/clips/my-clips'),
      ]);

      if (vodRes.ok) {
        const vodData = await vodRes.json();
        setVods(vodData.vods || []);
        if (vodData.totals) setVodTotals(vodData.totals);
      }

      if (clipRes.ok) {
        const clipData = await clipRes.json();
        setClips(clipData.clips || []);
        if (clipData.totals) setClipTotals({ totalViews: clipData.totals.totalViews, totalLikes: clipData.totals.totalLikes });
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVod = async (vodId: string) => {
    if (!confirm('Delete this recording? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/vods/${vodId}/edit`, { method: 'DELETE' });
      if (response.ok) {
        setVods(prev => prev.filter(v => v.id !== vodId));
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to delete recording');
      }
    } catch {
      showError('Failed to delete recording');
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    if (!confirm('Delete this clip? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/clips/${clipId}/delete`, { method: 'DELETE' });
      if (response.ok) {
        setClips(prev => prev.filter(c => c.id !== clipId));
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to delete clip');
      }
    } catch {
      showError('Failed to delete clip');
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getAccessBadge = (vod: VOD) => {
    if (vod.isPublic) return { label: 'Public', color: 'bg-green-500/80' };
    if (vod.subscribersOnly) return { label: 'Subscribers', color: 'bg-purple-500/80' };
    return { label: `${vod.priceCoins} coins`, color: 'bg-cyan-500/80' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="container mx-auto px-4 pt-20 md:pt-10 pb-24 md:pb-8 max-w-6xl">
        <h1 className="text-2xl font-bold text-white mb-6">Recordings</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <GlassCard className="p-3 text-center">
            <Eye className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{vodTotals.totalViews + clipTotals.totalViews}</div>
            <div className="text-gray-400 text-xs">Total Views</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <ShoppingCart className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{vodTotals.totalPurchases}</div>
            <div className="text-gray-400 text-xs">Purchases</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white flex items-center justify-center gap-1">
              {vodTotals.totalEarnings}
              <span className="text-xs font-normal text-yellow-400">coins</span>
            </div>
            <div className="text-gray-400 text-xs">Earnings</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <Film className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-xl font-bold text-white">{vods.length + clips.length}</div>
            <div className="text-gray-400 text-xs">Total</div>
          </GlassCard>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('vods')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'vods'
                ? 'bg-purple-500/20 border-2 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <Film className="w-4 h-4" />
            VODs ({vods.length})
          </button>
          <button
            onClick={() => setActiveTab('clips')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'clips'
                ? 'bg-cyan-500/20 border-2 border-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                : 'bg-white/5 border-2 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Clips ({clips.length})
          </button>
        </div>

        {/* VODs Tab */}
        {activeTab === 'vods' && (
          vods.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">No recordings yet</h3>
              <p className="text-gray-400 text-sm">Save your next stream to see it here.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vods.map((vod) => {
                const badge = getAccessBadge(vod);
                return (
                  <GlassCard key={vod.id} className="overflow-hidden group relative">
                    <div className="aspect-video relative bg-black">
                      {vod.thumbnailUrl ? (
                        <MediaThumbnail
                          src={vod.thumbnailUrl}
                          alt={vod.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                          <Film className="w-10 h-10 text-gray-600" />
                        </div>
                      )}

                      {/* Duration badge */}
                      {vod.duration > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white">
                            {formatDuration(vod.duration)}
                          </span>
                        </div>
                      )}

                      {/* Access badge */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {vod.isDraft && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gray-500/80">
                            Draft
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Link
                          href={`/vod/${vod.id}`}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="Watch"
                        >
                          <Play className="w-5 h-5 text-white" />
                        </Link>
                        <button
                          onClick={() => setEditVod(vod)}
                          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Coins className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={() => handleDeleteVod(vod.id)}
                          className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm truncate mb-2">{vod.title}</h3>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {vod.viewCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          {vod.purchaseCount}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-400 font-medium">
                          <Coins className="w-3 h-3" />
                          {vod.totalEarnings}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )
        )}

        {/* Clips Tab */}
        {activeTab === 'clips' && (
          clips.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">No clips yet</h3>
              <p className="text-gray-400 text-sm">Create clips from your VOD recordings.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clips.map((clip) => (
                <GlassCard key={clip.id} className="overflow-hidden group relative">
                  <div className="aspect-[9/16] relative bg-black">
                    {clip.thumbnailUrl ? (
                      <MediaThumbnail
                        src={clip.thumbnailUrl}
                        alt={clip.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <Scissors className="w-8 h-8 text-gray-600" />
                      </div>
                    )}

                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white">
                        0:{clip.duration.toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Link
                        href={`/clip/${clip.id}`}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="Watch"
                      >
                        <Play className="w-5 h-5 text-white" />
                      </Link>
                      <button
                        onClick={() => handleDeleteClip(clip.id)}
                        className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm truncate mb-2">{clip.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {clip.viewCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {clip.likeCount}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit VOD Modal */}
      {editVod && (
        <EditVODModal
          vod={editVod}
          onClose={() => setEditVod(null)}
          onSuccess={() => {
            setEditVod(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
