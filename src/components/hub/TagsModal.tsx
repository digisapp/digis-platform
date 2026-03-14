'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Tag, Plus, X, AlertCircle } from 'lucide-react';

interface TagData {
  id: string;
  name: string;
  itemCount: number;
}

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItemIds: string[];
  selectedCount: number;
}

export function TagsModal({ isOpen, onClose, selectedItemIds, selectedCount }: TagsModalProps) {
  const [tags, setTags] = useState<TagData[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/hub/tags');
      const data = await res.json();
      if (res.ok) setTags(data.tags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchTags();
  }, [isOpen, fetchTags]);

  const handleCreateAndApply = async (name: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hub/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          itemIds: selectedItemIds.length > 0 ? selectedItemIds : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewTagName('');
        await fetchTags();
      } else {
        setError(data.error || 'Failed to create tag');
      }
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleApplyTag = async (tagName: string) => {
    if (selectedItemIds.length === 0) return;

    try {
      await fetch('/api/hub/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagName,
          itemIds: selectedItemIds,
        }),
      });
      await fetchTags();
    } catch (err) {
      console.error('Failed to apply tag:', err);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await fetch(`/api/hub/tags?id=${tagId}`, { method: 'DELETE' });
      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Tags" size="sm">
      <div className="space-y-5">
        {selectedCount > 0 && (
          <p className="text-gray-400 text-sm">
            {selectedCount} items selected — tap a tag to apply
          </p>
        )}

        {/* Create new tag */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTagName.trim()) handleCreateAndApply(newTagName.trim());
            }}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
          />
          <button
            onClick={() => newTagName.trim() && handleCreateAndApply(newTagName.trim())}
            disabled={loading || !newTagName.trim()}
            className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Existing tags */}
        <div className="space-y-1.5">
          {tags.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No tags yet. Create one above.</p>
          ) : (
            tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
                <button
                  onClick={() => handleApplyTag(tag.name)}
                  disabled={selectedCount === 0}
                  className="flex items-center gap-2 text-left flex-1 disabled:opacity-60"
                >
                  <Tag className="w-4 h-4 text-cyan-400" />
                  <span className="text-white text-sm">{tag.name}</span>
                  <span className="text-gray-500 text-xs">{tag.itemCount} items</span>
                </button>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
