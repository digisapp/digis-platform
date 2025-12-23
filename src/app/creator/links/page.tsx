'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToastContext } from '@/context/ToastContext';
import { Link2, Plus, Pencil, Trash2, GripVertical, ExternalLink, X } from 'lucide-react';

interface CreatorLink {
  id: string;
  title: string;
  url: string;
  emoji: string | null;
  isActive: boolean;
  displayOrder: number;
}

// Common emojis for link buttons
const EMOJI_OPTIONS = ['🛍️', '💄', '👗', '📸', '🎁', '💰', '🔗', '✨', '💅', '👠', '🎵', '📱', '💻', '🎮', '📚', '🪽'];

export default function CreatorLinksPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const [links, setLinks] = useState<CreatorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<CreatorLink | null>(null);
  const [formData, setFormData] = useState({ title: '', url: '', emoji: '' });

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/creator/links');
      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
      }
    } catch (error) {
      showError('Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (link?: CreatorLink) => {
    if (link) {
      setEditingLink(link);
      setFormData({
        title: link.title,
        url: link.url,
        emoji: link.emoji || '',
      });
    } else {
      setEditingLink(null);
      setFormData({ title: '', url: '', emoji: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLink(null);
    setFormData({ title: '', url: '', emoji: '' });
  };

  const handleSaveLink = async () => {
    if (!formData.title.trim() || !formData.url.trim()) {
      showError('Title and URL are required');
      return;
    }

    // Validate URL
    try {
      new URL(formData.url);
    } catch {
      showError('Please enter a valid URL (include https://)');
      return;
    }

    setSaving(true);
    try {
      const url = editingLink
        ? `/api/creator/links/${editingLink.id}`
        : '/api/creator/links';
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          url: formData.url.trim(),
          emoji: formData.emoji || null,
        }),
      });

      if (response.ok) {
        showSuccess(editingLink ? 'Link updated!' : 'Link added!');
        handleCloseModal();
        fetchLinks();
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to save link');
      }
    } catch (error) {
      showError('Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      const response = await fetch(`/api/creator/links/${linkId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showSuccess('Link deleted');
        setLinks(links.filter(l => l.id !== linkId));
      } else {
        showError('Failed to delete link');
      }
    } catch (error) {
      showError('Failed to delete link');
    }
  };

  const handleToggleActive = async (link: CreatorLink) => {
    try {
      const response = await fetch(`/api/creator/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !link.isActive }),
      });

      if (response.ok) {
        setLinks(links.map(l =>
          l.id === link.id ? { ...l, isActive: !l.isActive } : l
        ));
      }
    } catch (error) {
      showError('Failed to update link');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, linkId: string) => {
    setDraggedId(linkId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = links.findIndex(l => l.id === draggedId);
    const targetIndex = links.findIndex(l => l.id === targetId);

    const newLinks = [...links];
    const [draggedItem] = newLinks.splice(draggedIndex, 1);
    newLinks.splice(targetIndex, 0, draggedItem);

    setLinks(newLinks);
    setDraggedId(null);

    // Save new order
    try {
      await fetch('/api/creator/links/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkIds: newLinks.map(l => l.id) }),
      });
    } catch (error) {
      console.error('Failed to save order:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <MobileHeader />

      <div className="container mx-auto px-4 pt-20 md:pt-10 pb-32 md:pb-10 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Links</h1>
              <p className="text-sm text-gray-400">Add affiliate & promo links to your profile</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <p className="text-sm text-cyan-300">
            Add up to 8 links that will appear on your profile page. Perfect for affiliate deals, discount codes, wishlists, and social media.
          </p>
        </div>

        {/* Add Link Button */}
        {links.length < 8 && (
          <button
            onClick={() => handleOpenModal()}
            className="w-full mb-6 p-4 border-2 border-dashed border-white/20 hover:border-cyan-500/50 rounded-xl text-gray-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add New Link</span>
          </button>
        )}

        {/* Links List */}
        {links.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400">No links yet</p>
            <p className="text-sm text-gray-500 mt-1">Add your first link to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div
                key={link.id}
                draggable
                onDragStart={(e) => handleDragStart(e, link.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, link.id)}
                className={`group p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all ${
                  draggedId === link.id ? 'opacity-50' : ''
                } ${!link.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Drag Handle */}
                  <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Emoji */}
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl">
                    {link.emoji || '🔗'}
                  </div>

                  {/* Title & URL */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{link.title}</h3>
                    <p className="text-xs text-gray-400 truncate">{link.url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Active Toggle */}
                    <button
                      onClick={() => handleToggleActive(link)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        link.isActive ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                        link.isActive ? 'translate-x-4' : ''
                      }`} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenModal(link)}
                      className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Preview Link */}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link count */}
        {links.length > 0 && (
          <p className="mt-4 text-center text-sm text-gray-500">
            {links.length}/8 links used
          </p>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-white/10 rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">
                {editingLink ? 'Edit Link' : 'Add New Link'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Icon (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={`w-10 h-10 rounded-lg text-xl transition-all ${
                        formData.emoji === emoji
                          ? 'bg-cyan-500/30 border-2 border-cyan-500'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  {formData.emoji && !EMOJI_OPTIONS.includes(formData.emoji) && (
                    <button
                      type="button"
                      className="w-10 h-10 rounded-lg text-xl bg-cyan-500/30 border-2 border-cyan-500"
                    >
                      {formData.emoji}
                    </button>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Shop My Favorites"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/my-link"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
              <GlassButton
                onClick={handleSaveLink}
                disabled={saving || !formData.title.trim() || !formData.url.trim()}
                variant="gradient"
                className="flex-1"
              >
                {saving ? <LoadingSpinner size="sm" /> : (editingLink ? 'Save Changes' : 'Add Link')}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
