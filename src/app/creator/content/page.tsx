'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Plus, Edit, Trash2, Eye, ShoppingCart, DollarSign, MoreVertical } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

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

export default function CreatorContentStudioPage() {
  const router = useRouter();
  const [content, setContent] = useState<CreatorContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<CreatorContent | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', unlockPrice: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await fetch('/api/content/creator');
      const data = await response.json();

      if (response.ok) {
        setContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (contentId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (response.ok) {
        await fetchContent();
      }
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const handleEditContent = (item: CreatorContent) => {
    setEditForm({
      title: item.title,
      description: item.description || '',
      unlockPrice: item.unlockPrice,
    });
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
        await fetchContent();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update content');
      }
    } catch (error) {
      console.error('Error updating content:', error);
      alert('Failed to update content');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchContent();
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const totalEarnings = content.reduce((sum, item) => sum + item.totalEarnings, 0);
  const totalPurchases = content.reduce((sum, item) => sum + item.purchaseCount, 0);
  const totalViews = content.reduce((sum, item) => sum + item.viewCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      {/* Mobile Header */}
      <MobileHeader />

      <div className="container mx-auto px-4 pt-2 md:pt-10 pb-24 md:pb-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-end">
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={() => router.push('/creator/content/new')}
            className="flex items-center gap-2"
            shimmer
          >
            <Plus className="w-5 h-5" />
            Upload Content
          </GlassButton>
        </div>

        {/* Content List */}
        {content.length === 0 ? (
          <GlassCard className="p-16 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-2xl font-bold text-white mb-2">No content yet</h3>
            <p className="text-gray-400 text-lg mb-6">Upload your first exclusive content to start earning!</p>
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => router.push('/creator/content/new')}
              className="flex items-center gap-2 mx-auto"
              shimmer
            >
              <Plus className="w-5 h-5" />
              Upload Content
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {content.map((item) => (
              <GlassCard key={item.id} className="overflow-hidden group relative">
                {/* Thumbnail */}
                <div className="aspect-square relative bg-black">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-black/60 text-white capitalize backdrop-blur-sm">
                      {item.contentType === 'video' ? '▶ Video' : item.contentType === 'gallery' ? '⊞ Gallery' : '📷 Photo'}
                    </span>
                  </div>

                  {/* Price badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold backdrop-blur-sm ${
                      item.isFree
                        ? 'bg-green-500/80 text-white'
                        : 'bg-amber-500/80 text-white'
                    }`}>
                      {item.isFree ? 'FREE' : `${item.unlockPrice} 🪙`}
                    </span>
                  </div>

                  {/* Status indicator */}
                  {!item.isPublished && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-500/80 text-white backdrop-blur-sm">
                        Draft
                      </span>
                    </div>
                  )}

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditContent(item)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={() => handleTogglePublish(item.id, item.isPublished)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title={item.isPublished ? 'Unpublish' : 'Publish'}
                    >
                      <Eye className={`w-5 h-5 ${item.isPublished ? 'text-green-400' : 'text-gray-400'}`} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-red-500/30 hover:bg-red-500/50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Content info */}
                <div className="p-3">
                  <h3 className="font-semibold text-white text-sm truncate mb-2">{item.title}</h3>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.viewCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      {item.purchaseCount}
                    </span>
                    <span className="flex items-center gap-1 text-digis-cyan font-medium">
                      <DollarSign className="w-3 h-3" />
                      {item.totalEarnings}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Summary Stats at Bottom */}
        {content.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <GlassCard className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-digis-cyan mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{totalEarnings}</div>
              <div className="text-gray-400 text-sm">Total Earnings</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <ShoppingCart className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{totalPurchases}</div>
              <div className="text-gray-400 text-sm">Purchases</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Eye className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{totalViews}</div>
              <div className="text-gray-400 text-sm">Total Views</div>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <div className="text-2xl mb-2">📸</div>
              <div className="text-2xl font-bold text-white">{content.length}</div>
              <div className="text-gray-400 text-sm">Content Items</div>
            </GlassCard>
          </div>
        )}

        {/* Edit Modal */}
        {selectedContent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassCard className="p-6 max-w-lg w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Content</h2>

              {/* Thumbnail Preview */}
              {selectedContent.thumbnailUrl && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src={selectedContent.thumbnailUrl}
                    alt={selectedContent.title}
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan transition-all"
                    placeholder="Enter title..."
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan transition-all resize-none"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Unlock Price (coins)
                  </label>
                  <input
                    type="number"
                    value={editForm.unlockPrice}
                    onChange={(e) => setEditForm({ ...editForm, unlockPrice: parseInt(e.target.value) || 0 })}
                    min={0}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-digis-cyan transition-all"
                    placeholder="0 for free"
                  />
                  <p className="text-xs text-gray-500 mt-1">Set to 0 for free content</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <GlassButton
                  variant="ghost"
                  onClick={() => setSelectedContent(null)}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="gradient"
                  onClick={handleSaveEdit}
                  className="flex-1"
                  disabled={saving || !editForm.title.trim()}
                >
                  {saving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
