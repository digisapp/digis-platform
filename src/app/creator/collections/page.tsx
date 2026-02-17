'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Eye, ShoppingCart, Coins, GripVertical } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

interface CollectionItem {
  id: string;
  position: number;
  content?: { id: string; title: string; thumbnailUrl: string; contentType: string } | null;
  vod?: { id: string; title: string; thumbnailUrl: string; duration: number } | null;
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceCoins: number;
  subscribersOnly: boolean;
  isPublished: boolean;
  itemCount: number;
  purchaseCount: number;
  totalEarnings: number;
  displayOrder: number;
  items: CollectionItem[];
  createdAt: string;
}

export default function CreatorCollectionsPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToastContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections/creator');
      const data = await res.json();
      if (res.ok) setCollections(data.collections);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Collection deleted');
        fetchCollections();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to delete');
      }
    } catch {
      showError('Failed to delete collection');
    }
  };

  const handleTogglePublish = async (collection: Collection) => {
    try {
      const res = await fetch(`/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !collection.isPublished }),
      });
      if (res.ok) {
        showSuccess(collection.isPublished ? 'Unpublished' : 'Published');
        fetchCollections();
      }
    } catch {
      showError('Failed to update collection');
    }
  };

  // Summary stats
  const totalEarnings = collections.reduce((sum, c) => sum + c.totalEarnings, 0);
  const totalPurchases = collections.reduce((sum, c) => sum + c.purchaseCount, 0);
  const totalItems = collections.reduce((sum, c) => sum + c.itemCount, 0);

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-4xl mx-auto p-4 pt-20">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <GlassCard className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalEarnings}</div>
            <div className="text-xs text-gray-400">Total Earnings</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-2xl font-bold">{totalPurchases}</div>
            <div className="text-xs text-gray-400">Purchases</div>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <div className="text-2xl font-bold">{totalItems}</div>
            <div className="text-xs text-gray-400">Total Items</div>
          </GlassCard>
        </div>

        {/* Create button */}
        <GlassButton
          onClick={() => router.push('/creator/collections/new')}
          className="w-full mb-6 flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Create Collection
        </GlassButton>

        {/* Collections list */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : collections.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-400 mb-4">No collections yet</p>
            <p className="text-sm text-gray-500">
              Organize your content into collections to sell structured series, courses, or bundles.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <GlassCard key={collection.id} className="p-4">
                <div className="flex gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                    {collection.thumbnailUrl ? (
                      <img
                        src={collection.thumbnailUrl}
                        alt={collection.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-2xl">
                        {collection.itemCount}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold truncate">{collection.title}</h3>
                        <p className="text-sm text-gray-400">
                          {collection.itemCount} items
                          {!collection.isPublished && (
                            <span className="ml-2 text-yellow-500">Draft</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        {collection.priceCoins === 0 ? (
                          <span className="text-green-400">FREE</span>
                        ) : (
                          <span className="text-yellow-400">{collection.priceCoins} coins</span>
                        )}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <ShoppingCart size={12} /> {collection.purchaseCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins size={12} /> {collection.totalEarnings}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => router.push(`/creator/collections/${collection.id}`)}
                        className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1"
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublish(collection)}
                        className="text-xs px-3 py-1 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1"
                      >
                        <Eye size={12} /> {collection.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => handleDelete(collection.id)}
                        className="text-xs px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
