'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Save, Plus, Trash2, GripVertical, Video, Image, Layers } from 'lucide-react';

interface CollectionItem {
  id: string;
  position: number;
  contentId: string | null;
  vodId: string | null;
  content?: { id: string; title: string; thumbnailUrl: string; contentType: string } | null;
  vod?: { id: string; title: string; thumbnailUrl: string | null; duration: number | null } | null;
}

interface Collection {
  id: string;
  title: string;
  description: string | null;
  priceCoins: number;
  subscribersOnly: boolean;
  isPublished: boolean;
  itemCount: number;
  items: CollectionItem[];
}

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.collectionId as string;
  const { showError, showSuccess } = useToastContext();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCoins, setPriceCoins] = useState(0);
  const [isPublished, setIsPublished] = useState(true);

  // For adding items
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [availableContent, setAvailableContent] = useState<any[]>([]);
  const [availableVods, setAvailableVods] = useState<any[]>([]);

  useEffect(() => {
    fetchCollection();
  }, [collectionId]);

  const fetchCollection = async () => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      const data = await res.json();
      if (res.ok && data.collection) {
        setCollection(data.collection);
        setTitle(data.collection.title);
        setDescription(data.collection.description || '');
        setPriceCoins(data.collection.priceCoins);
        setIsPublished(data.collection.isPublished);
      }
    } catch (error) {
      showError('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priceCoins, isPublished }),
      });
      if (res.ok) {
        showSuccess('Collection saved');
        fetchCollection();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to save');
      }
    } catch {
      showError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showSuccess('Item removed');
        fetchCollection();
      }
    } catch {
      showError('Failed to remove item');
    }
  };

  const handleAddItem = async (type: 'content' | 'vod', id: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: type === 'content' ? id : undefined,
          vodId: type === 'vod' ? id : undefined,
        }),
      });
      if (res.ok) {
        showSuccess('Item added');
        fetchCollection();
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to add item');
      }
    } catch {
      showError('Failed to add item');
    }
  };

  const loadAvailableItems = async () => {
    setShowAddPanel(true);
    try {
      const [contentRes, vodRes] = await Promise.all([
        fetch('/api/content/creator'),
        fetch('/api/vods/creator').catch(() => ({ ok: false, json: () => ({ vods: [] }) })),
      ]);
      if (contentRes.ok) {
        const data = await contentRes.json();
        setAvailableContent(data.content || []);
      }
      if (vodRes.ok) {
        const data = await (vodRes as Response).json();
        setAvailableVods(data.vods || []);
      }
    } catch (error) {
      console.error('Error loading available items:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Collection not found</p>
      </div>
    );
  }

  const existingItemIds = new Set(
    collection.items.map(i => i.contentId || i.vodId).filter(Boolean)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {/* Edit details */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Details</h2>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Price (coins, 0 = free)</label>
            <input
              type="number"
              value={priceCoins}
              onChange={(e) => setPriceCoins(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Published</span>
          </div>
          <GlassButton onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </GlassButton>
        </GlassCard>

        {/* Items */}
        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Items ({collection.items.length})</h2>
            <button
              onClick={loadAvailableItems}
              className="text-sm px-3 py-1 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {collection.items.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No items yet</p>
          ) : (
            <div className="space-y-2">
              {collection.items
                .sort((a, b) => a.position - b.position)
                .map((item, idx) => {
                  const itemTitle = item.content?.title || item.vod?.title || 'Unknown';
                  const itemType = item.contentId ? 'Content' : 'VOD';
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                      <GripVertical size={14} className="text-gray-600" />
                      <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">{itemType}</span>
                      <span className="flex-1 truncate text-sm">{itemTitle}</span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </GlassCard>

        {/* Add items panel */}
        {showAddPanel && (
          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Add Items</h2>
              <button onClick={() => setShowAddPanel(false)} className="text-gray-400 hover:text-white">
                Close
              </button>
            </div>

            {availableContent.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Content</h3>
                <div className="space-y-1">
                  {availableContent
                    .filter(c => !existingItemIds.has(c.id))
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAddItem('content', item.id)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"
                      >
                        {item.contentType === 'video' ? <Video size={14} /> :
                         item.contentType === 'gallery' ? <Layers size={14} /> :
                         <Image size={14} />}
                        <span className="text-sm truncate">{item.title}</span>
                        <Plus size={14} className="ml-auto text-gray-500" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {availableVods.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-400 mb-2">VODs</h3>
                <div className="space-y-1">
                  {availableVods
                    .filter((v: any) => !existingItemIds.has(v.id))
                    .map((vod: any) => (
                      <button
                        key={vod.id}
                        onClick={() => handleAddItem('vod', vod.id)}
                        className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-white/10"
                      >
                        <Video size={14} />
                        <span className="text-sm truncate">{vod.title}</span>
                        <Plus size={14} className="ml-auto text-gray-500" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
