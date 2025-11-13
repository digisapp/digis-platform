'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Plus, Edit, Trash2, Eye, ShoppingCart, DollarSign, MoreVertical } from 'lucide-react';

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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<CreatorContent | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

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
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 pt-0 md:pt-6 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-white">Content Studio 🎬</h1>
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2"
              shimmer
            >
              <Plus className="w-5 h-5" />
              Upload Content
            </GlassButton>
          </div>
          <p className="text-gray-400">Manage your exclusive content and track earnings</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/10 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-digis-cyan" />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Total Earnings</div>
                <div className="text-2xl font-bold text-white">{totalEarnings}</div>
                <div className="text-xs text-gray-500">coins</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/10 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-digis-pink" />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Purchases</div>
                <div className="text-2xl font-bold text-white">{totalPurchases}</div>
                <div className="text-xs text-gray-500">total</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/10 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Total Views</div>
                <div className="text-2xl font-bold text-white">{totalViews}</div>
                <div className="text-xs text-gray-500">all time</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/10 p-3 rounded-lg">
                <Plus className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-gray-400 text-sm">Content Items</div>
                <div className="text-2xl font-bold text-white">{content.length}</div>
                <div className="text-xs text-gray-500">published</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Content List */}
        {content.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-bold text-white mb-2">No content yet</h3>
            <p className="text-gray-400 mb-6">Upload your first exclusive content to start earning!</p>
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 mx-auto"
              shimmer
            >
              <Plus className="w-5 h-5" />
              Upload Content
            </GlassButton>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {content.map((item) => (
              <GlassCard key={item.id} className="p-6">
                <div className="flex gap-6">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-black">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-white">{item.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            item.isPublished
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-gray-500/20 text-gray-300'
                          }`}>
                            {item.isPublished ? '✓ Published' : 'Draft'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-300 capitalize">
                            {item.contentType}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{item.description}</p>
                        )}
                      </div>

                      {/* Actions Menu */}
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === item.id ? null : item.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>

                        {showMenu === item.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-10">
                            <button
                              onClick={() => {
                                setSelectedContent(item);
                                setShowMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                handleTogglePublish(item.id, item.isPublished);
                                setShowMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors"
                            >
                              {item.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(item.id);
                                setShowMenu(null);
                              }}
                              className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors rounded-b-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1">Price</div>
                        <div className="text-white font-bold">
                          {item.isFree ? 'Free' : `${item.unlockPrice} coins`}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1">Earnings</div>
                        <div className="text-digis-cyan font-bold">{item.totalEarnings}</div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1">Purchases</div>
                        <div className="text-white font-bold">{item.purchaseCount}</div>
                      </div>

                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-gray-400 text-xs mb-1">Views</div>
                        <div className="text-white font-bold">{item.viewCount}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Upload Modal Placeholder */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassCard className="p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Upload Content</h2>
              <p className="text-gray-400 mb-6">Content upload functionality will be implemented with file upload integration.</p>
              <div className="flex gap-3">
                <GlassButton
                  variant="ghost"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="gradient"
                  onClick={() => {
                    alert('Content upload coming soon!');
                    setShowUploadModal(false);
                  }}
                  className="flex-1"
                >
                  Coming Soon
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Edit Modal Placeholder */}
        {selectedContent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <GlassCard className="p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Edit Content</h2>
              <p className="text-gray-400 mb-6">Editing: {selectedContent.title}</p>
              <div className="flex gap-3">
                <GlassButton
                  variant="ghost"
                  onClick={() => setSelectedContent(null)}
                  className="flex-1"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="gradient"
                  onClick={() => {
                    alert('Edit functionality coming soon!');
                    setSelectedContent(null);
                  }}
                  className="flex-1"
                >
                  Save Changes
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
