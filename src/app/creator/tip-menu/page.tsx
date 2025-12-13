'use client';

import { useEffect, useState } from 'react';
import { GlassCard, GlassButton, LoadingSpinner } from '@/components/ui';
import { Plus, Trash2, GripVertical, Coins, X } from 'lucide-react';
import { MobileHeader } from '@/components/layout/MobileHeader';

interface TipMenuItem {
  id: string;
  label: string;
  emoji: string | null;
  price: number;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

const EMOJI_OPTIONS = ['🎵', '🎤', '💋', '🔥', '💃', '🎮', '❓', '💪', '🎭', '⭐', '💬', '🎁'];

export default function TipMenuPage() {
  const [items, setItems] = useState<TipMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TipMenuItem | null>(null);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/creator/tip-menu');
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error fetching tip menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormLabel('');
    setFormEmoji('');
    setFormPrice('');
    setFormDescription('');
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: TipMenuItem) => {
    setFormLabel(item.label);
    setFormEmoji(item.emoji || '');
    setFormPrice(item.price.toString());
    setFormDescription(item.description || '');
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formLabel.trim() || !formPrice) return;

    setSaving(true);
    try {
      const payload = {
        label: formLabel.trim(),
        emoji: formEmoji || null,
        price: parseInt(formPrice),
        description: formDescription.trim() || null,
      };

      let response;
      if (editingItem) {
        response = await fetch(`/api/creator/tip-menu/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/creator/tip-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        await fetchItems();
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tip menu item?')) return;

    try {
      const response = await fetch(`/api/creator/tip-menu/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const toggleActive = async (item: TipMenuItem) => {
    try {
      const response = await fetch(`/api/creator/tip-menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (response.ok) {
        setItems(items.map(i =>
          i.id === item.id ? { ...i, isActive: !i.isActive } : i
        ));
      }
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="max-w-2xl mx-auto">
        <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

        <div className="px-4 pt-4 md:pt-10 pb-24 md:pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Tip Menu</h1>
              <p className="text-gray-400 text-sm mt-1">
                Create tip options for your live streams
              </p>
            </div>
            <GlassButton
              onClick={openAddModal}
              variant="gradient"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </GlassButton>
          </div>

          {/* Items List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : items.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Coins className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No tip menu items yet</h3>
              <p className="text-gray-400 mb-4">
                Add items that fans can tip for during your live streams
              </p>
              <GlassButton onClick={openAddModal} variant="gradient">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Item
              </GlassButton>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <GlassCard
                  key={item.id}
                  className={`p-4 ${!item.isActive ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl w-10 text-center">
                      {item.emoji || '🎁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">
                          {item.label}
                        </span>
                        {!item.isActive && (
                          <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">
                            Hidden
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-400 truncate">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400 font-bold">
                      <Coins className="w-4 h-4" />
                      {item.price}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          item.isActive
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {item.isActive ? 'Active' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Preview Section */}
          {items.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-3">Preview (as fans see it)</h2>
              <GlassCard className="p-4">
                <div className="text-sm text-gray-400 mb-3">Tip Menu</div>
                <div className="grid grid-cols-2 gap-2">
                  {items.filter(i => i.isActive).map((item) => (
                    <button
                      key={item.id}
                      className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-left"
                    >
                      <span className="text-xl">{item.emoji || '🎁'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">{item.label}</div>
                        <div className="text-yellow-400 text-xs font-bold">{item.price} coins</div>
                      </div>
                    </button>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingItem ? 'Edit Item' : 'Add Tip Menu Item'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormEmoji(formEmoji === emoji ? '' : emoji)}
                      className={`w-10 h-10 text-xl rounded-lg border transition-colors ${
                        formEmoji === emoji
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Label *
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g., Song Request, Shoutout"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  maxLength={50}
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price (coins) *
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formPrice}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormPrice(value);
                    }}
                    placeholder="100"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short description of what they get"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  maxLength={100}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <GlassButton
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  variant="ghost"
                  className="flex-1"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  onClick={handleSave}
                  variant="gradient"
                  className="flex-1"
                  disabled={!formLabel.trim() || !formPrice || saving}
                >
                  {saving ? <LoadingSpinner size="sm" /> : editingItem ? 'Save Changes' : 'Add Item'}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
