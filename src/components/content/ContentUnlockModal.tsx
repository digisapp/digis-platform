'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Unlock, X } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  type: 'photo' | 'video';
  unlockPrice: number;
  thumbnail: string | null;
  creatorName: string;
}

interface ContentUnlockModalProps {
  content: ContentItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContentUnlockModal({ content, onClose, onSuccess }: ContentUnlockModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUnlock = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/content/${content.id}/purchase`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock content');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock content');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/20 max-w-xs w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5">

          {/* Title */}
          <h3 className="text-lg font-semibold text-white text-center mb-4">
            {content.title}
          </h3>

          {/* Price */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-full border border-yellow-500/30">
              <span className="text-2xl font-bold text-yellow-400">{content.unlockPrice}</span>
              <span className="text-yellow-400/80">coins</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Unlock Button */}
          <GlassButton
            type="button"
            variant="gradient"
            size="lg"
            onClick={handleUnlock}
            className="w-full"
            disabled={loading}
            shimmer
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Unlock className="w-5 h-5" />
                Unlock Now
              </span>
            )}
          </GlassButton>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
