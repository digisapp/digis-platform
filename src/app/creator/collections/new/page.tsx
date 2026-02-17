'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Plus, X, Video, Image, Layers } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  contentType: string;
}

interface VodItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToastContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCoins, setPriceCoins] = useState(0);
  const [isFree, setIsFree] = useState(true);
  const [saving, setSaving] = useState(false);

  // Available content to add
  const [availableContent, setAvailableContent] = useState<ContentItem[]>([]);
  const [availableVods, setAvailableVods] = useState<VodItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ type: 'content' | 'vod'; id: string; title: string }[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
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
        console.error('Error loading content:', error);
      } finally {
        setLoadingContent(false);
      }
    };
    fetchItems();
  }, []);

  const addItem = (type: 'content' | 'vod', id: string, title: string) => {
    if (selectedItems.some(i => i.id === id)) return;
    setSelectedItems(prev => [...prev, { type, id, title }]);
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Title is required');
      return;
    }

    setSaving(true);
    try {
      // Create collection
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priceCoins: isFree ? 0 : priceCoins,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showError(data.error || 'Failed to create collection');
        return;
      }

      const { collection } = await res.json();

      // Add items to collection
      for (const item of selectedItems) {
        await fetch(`/api/collections/${collection.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: item.type === 'content' ? item.id : undefined,
            vodId: item.type === 'vod' ? item.id : undefined,
          }),
        });
      }

      showSuccess('Collection created!');
      router.push('/creator/collections');
    } catch {
      showError('Failed to create collection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {/* Details */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Collection Details</h2>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sales Fundamentals Series"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will viewers learn or get from this collection?"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
            />
          </div>
        </GlassCard>

        {/* Pricing */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Pricing</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setIsFree(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                isFree ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setIsFree(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                !isFree ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400'
              }`}
            >
              Paid
            </button>
          </div>
          {!isFree && (
            <div>
              <label className="text-sm text-gray-400 block mb-1">Price (coins)</label>
              <input
                type="number"
                value={priceCoins}
                onChange={(e) => setPriceCoins(Math.max(1, parseInt(e.target.value) || 0))}
                min={1}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          )}
        </GlassCard>

        {/* Selected items */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Items ({selectedItems.length})</h2>
          {selectedItems.length === 0 ? (
            <p className="text-gray-500 text-sm">Add content or VODs from below</p>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-gray-500 text-sm w-6">{idx + 1}.</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-400">
                    {item.type === 'vod' ? 'VOD' : 'Content'}
                  </span>
                  <span className="flex-1 truncate text-sm">{item.title}</span>
                  <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Available content to add */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Add Content</h2>
          {loadingContent ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <>
              {availableContent.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Your Content</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableContent.map((item) => {
                      const isSelected = selectedItems.some(i => i.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => addItem('content', item.id, item.title)}
                          disabled={isSelected}
                          className={`text-left p-2 rounded-lg border ${
                            isSelected
                              ? 'border-green-500/30 bg-green-500/10 opacity-50'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {item.contentType === 'video' ? <Video size={14} /> :
                             item.contentType === 'gallery' ? <Layers size={14} /> :
                             <Image size={14} />}
                            <span className="text-sm truncate">{item.title}</span>
                          </div>
                          {isSelected && <span className="text-xs text-green-400">Added</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {availableVods.length > 0 && (
                <div>
                  <h3 className="text-sm text-gray-400 mb-2">Your VODs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableVods.map((vod) => {
                      const isSelected = selectedItems.some(i => i.id === vod.id);
                      return (
                        <button
                          key={vod.id}
                          onClick={() => addItem('vod', vod.id, vod.title)}
                          disabled={isSelected}
                          className={`text-left p-2 rounded-lg border ${
                            isSelected
                              ? 'border-green-500/30 bg-green-500/10 opacity-50'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Video size={14} />
                            <span className="text-sm truncate">{vod.title}</span>
                          </div>
                          {isSelected && <span className="text-xs text-green-400">Added</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {availableContent.length === 0 && availableVods.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  No content available. Upload content or record VODs first.
                </p>
              )}
            </>
          )}
        </GlassCard>

        {/* Create button */}
        <GlassButton
          onClick={handleCreate}
          disabled={saving || !title.trim()}
          className="w-full"
        >
          {saving ? 'Creating...' : 'Create Collection'}
        </GlassButton>
      </div>
    </div>
  );
}
