'use client';

import { GlassButton, LoadingSpinner } from '@/components/ui';
import { X } from 'lucide-react';
import { LINK_EMOJI_OPTIONS, type CreatorLink } from './types';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLink: CreatorLink | null;
  linkFormData: { title: string; url: string; emoji: string };
  setLinkFormData: (data: { title: string; url: string; emoji: string }) => void;
  onSave: () => void;
  saving: boolean;
}

export function LinkModal({ isOpen, onClose, editingLink, linkFormData, setLinkFormData, onSave, saving }: LinkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-gradient-to-b from-neutral-900 to-black border border-white/10 rounded-2xl max-w-md w-full shadow-2xl" role="dialog" aria-modal="true" aria-label="Add link">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">
            {editingLink ? 'Edit Link' : 'Add New Link'}
          </h2>
          <button
            onClick={onClose}
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
              {LINK_EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setLinkFormData({ ...linkFormData, emoji })}
                  className={`w-10 h-10 rounded-lg text-xl transition-all ${
                    linkFormData.emoji === emoji
                      ? 'bg-cyan-500/30 border-2 border-cyan-500'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              {linkFormData.emoji && !LINK_EMOJI_OPTIONS.includes(linkFormData.emoji) && (
                <button
                  type="button"
                  className="w-10 h-10 rounded-lg text-xl bg-cyan-500/30 border-2 border-cyan-500"
                >
                  {linkFormData.emoji}
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
              value={linkFormData.title}
              onChange={(e) => setLinkFormData({ ...linkFormData, title: e.target.value })}
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
              value={linkFormData.url}
              onChange={(e) => setLinkFormData({ ...linkFormData, url: e.target.value })}
              placeholder="https://example.com/my-link"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
          >
            Cancel
          </button>
          <GlassButton
            onClick={onSave}
            disabled={saving || !linkFormData.title.trim() || !linkFormData.url.trim()}
            variant="gradient"
            className="flex-1"
          >
            {saving ? <LoadingSpinner size="sm" /> : (editingLink ? 'Save Changes' : 'Add Link')}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
