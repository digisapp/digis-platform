'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Tabs } from '@/components/ui/Tabs';
import { useToastContext } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Eye, ShoppingCart, Coins, Heart, Play, Film, Scissors, Image as ImageIcon } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
import { EditVODModal } from '@/components/vods/EditVODModal';
import Link from 'next/link';

interface CreatorContent {
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
  totalEarnings: number;
  isPublished: boolean;
  createdAt: string;
}

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

const TABS = [
  { id: 'digitals', label: 'Drops', icon: ImageIcon },
  { id: 'clips', label: 'Clips', icon: Scissors },
  { id: 'vods', label: 'VODs', icon: Film },
];

export default function CreatorContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError } = useToastContext();

  const initialTab = searchParams.get('tab') || 'digitals';
  const [activeTab, setActiveTab] = useState(TABS.some(t => t.id === initialTab) ? initialTab : 'digitals');

  // Digitals state
  const [content, setContent] = useState<CreatorContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<CreatorContent | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', unlockPrice: 0 });
  const [saving, setSaving] = useState(false);

  // VODs & Clips state
  const [vods, setVods] = useState<VOD[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [editVod, setEditVod] = useState<VOD | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [contentRes, vodRes, clipRes] = await Promise.all([
        fetch('/api/content/creator'),
        fetch('/api/vods/my-vods'),
        fetch('/api/clips/my-clips'),
      ]);

      if (contentRes.ok) {
        const data = await contentRes.json();
        setContent(data.content || []);
      }
      if (vodRes.ok) {
        const data = await vodRes.json();
        setVods(data.vods || []);
      }
      if (clipRes.ok) {
        const data = await clipRes.json();
        setClips(data.clips || []);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Digitals handlers ──

  const handleTogglePublish = async (contentId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });
      if (response.ok) await fetchAllData();
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const handleEditContent = (item: CreatorContent) => {
    setEditForm({ title: item.title, description: item.description || '', unlockPrice: item.unlockPrice });
    setSelectedContent(item);
  };

  const handleSaveEdit = async () => {
    if (!selectedContent) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/content/${selectedContent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          unlockPrice: editForm.unlockPrice,
        }),
      });
      if (response.ok) {
        setSelectedContent(null);
        await fetchAllData();
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to update content');
      }
    } catch {
      showError('Failed to update content');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/content/${contentId}`, { method: 'DELETE' });
      if (response.ok) await fetchAllData();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  // ── VOD handlers ──

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

  // ── Clip handlers ──

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

  // ── Helpers ──

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

      <div className="container mx-auto px-4 pt-20 md:pt-10 pb-24 md:pb-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Content</h1>
          {activeTab === 'digitals' && (
            <GlassButton
              variant="gradient"
              onClick={() => router.push('/cloud')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cloud
            </GlassButton>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Content type tabs" />
        </div>

        {/* ── Digitals Tab ── */}
        {activeTab === 'digitals' && (
          content.length === 0 ? (
            <GlassCard className="p-16 text-center">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-2xl font-bold text-white mb-2">No content yet</h3>
              <p className="text-gray-400 text-lg mb-6">Create your first exclusive content to start earning!</p>
              <GlassButton
                variant="gradient"
                size="lg"
                onClick={() => router.push('/cloud')}
                className="flex items-center gap-2 mx-auto"
                shimmer
              >
                <Plus className="w-5 h-5" />
                Cloud
              </GlassButton>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {content.map((item) => (
                <GlassCard key={item.id} className="overflow-hidden group relative">
                  <div className="aspect-square relative bg-black">
                    <MediaThumbnail
                      src={item.thumbnailUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/60 text-white capitalize backdrop-blur-sm">
                        {item.contentType === 'video' ? 'Video' : item.contentType === 'gallery' ? 'Gallery' : 'Photo'}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold backdrop-blur-sm ${
                        item.isFree ? 'bg-green-500/80 text-white' : 'bg-amber-500/80 text-white'
                      }`}>
                        {item.isFree ? 'FREE' : `${item.unlockPrice} coins`}
                      </span>
                    </div>
                    {!item.isPublished && (
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-500/80 text-white backdrop-blur-sm">
                          Draft
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => handleEditContent(item)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-5 h-5 text-white" />
                      </button>
                      <button onClick={() => handleTogglePublish(item.id, item.isPublished)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title={item.isPublished ? 'Unpublish' : 'Publish'}>
                        <Eye className={`w-5 h-5 ${item.isPublished ? 'text-green-400' : 'text-gray-400'}`} />
                      </button>
                      <button onClick={() => handleDeleteContent(item.id)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm truncate mb-2">{item.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.viewCount}</span>
                      <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{item.purchaseCount}</span>
                      <span className="flex items-center gap-1 text-yellow-400 font-medium"><Coins className="w-3 h-3" />{item.totalEarnings}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )
        )}

        {/* ── Clips Tab ── */}
        {activeTab === 'clips' && (
          clips.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Scissors className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">No clips yet</h3>
              <p className="text-gray-400 text-sm">Clip your live streams to create short-form content.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {clips.map((clip) => (
                <GlassCard key={clip.id} className="overflow-hidden group relative">
                  <div className="aspect-[9/16] relative bg-black">
                    {clip.thumbnailUrl ? (
                      <MediaThumbnail src={clip.thumbnailUrl} alt={clip.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <Scissors className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white">
                        0:{clip.duration.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Link href={`/clip/${clip.id}`} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Watch">
                        <Play className="w-5 h-5 text-white" />
                      </Link>
                      <button onClick={() => handleDeleteClip(clip.id)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm truncate mb-2">{clip.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{clip.viewCount}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{clip.likeCount}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )
        )}

        {/* ── VODs Tab ── */}
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
                        <MediaThumbnail src={vod.thumbnailUrl} alt={vod.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                          <Film className="w-10 h-10 text-gray-600" />
                        </div>
                      )}
                      {vod.duration > 0 && (
                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white">{formatDuration(vod.duration)}</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {vod.isDraft && <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gray-500/80">Draft</span>}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${badge.color}`}>{badge.label}</span>
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Link href={`/vod/${vod.id}`} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Watch">
                          <Play className="w-5 h-5 text-white" />
                        </Link>
                        <button onClick={() => setEditVod(vod)} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors" title="Edit">
                          <Coins className="w-5 h-5 text-white" />
                        </button>
                        <button onClick={() => handleDeleteVod(vod.id)} className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm truncate mb-2">{vod.title}</h3>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{vod.viewCount}</span>
                        <span className="flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{vod.purchaseCount}</span>
                        <span className="flex items-center gap-1 text-yellow-400 font-medium"><Coins className="w-3 h-3" />{vod.totalEarnings}</span>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Edit Digital Content Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <GlassCard className="p-6 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Content</h2>
            {selectedContent.thumbnailUrl && (
              <div className="mb-6 rounded-lg overflow-hidden bg-black relative h-64">
                <MediaThumbnail src={selectedContent.thumbnailUrl} alt={selectedContent.title} fill sizes="500px" className="object-contain" />
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan transition-all"
                  placeholder="Enter title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Unlock Price (coins)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={editForm.unlockPrice === 0 ? '' : editForm.unlockPrice.toString()}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setEditForm({ ...editForm, unlockPrice: value === '' ? 0 : parseInt(value) });
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan transition-all"
                  placeholder="0 for free"
                />
                <p className="text-xs text-gray-500 mt-1">Set to 0 for free content, or enter a price to make it PPV</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <GlassButton variant="ghost" onClick={() => setSelectedContent(null)} className="flex-1" disabled={saving}>Cancel</GlassButton>
              <GlassButton variant="gradient" onClick={handleSaveEdit} className="flex-1" disabled={saving || !editForm.title.trim()}>
                {saving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Edit VOD Modal */}
      {editVod && (
        <EditVODModal
          vod={editVod}
          onClose={() => setEditVod(null)}
          onSuccess={() => {
            setEditVod(null);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}
