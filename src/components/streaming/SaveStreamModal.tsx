'use client';

import { useState } from 'react';
import { GlassModal, GlassInput, GlassButton } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface SaveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamTitle: string;
  streamDescription?: string;
  onSaved: (vodId: string) => void;
}

export function SaveStreamModal({
  isOpen,
  onClose,
  streamId,
  streamTitle,
  streamDescription,
  onSaved,
}: SaveStreamModalProps) {
  const [title, setTitle] = useState(streamTitle);
  const [description, setDescription] = useState(streamDescription || '');
  const [priceCoins, setPriceCoins] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const finalPrice = parseInt(priceCoins) || 0;
      if (finalPrice < 0) {
        throw new Error('Price must be 0 or greater');
      }

      const response = await fetch(`/api/streams/${streamId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priceCoins: finalPrice,
          isPublic: false,
          subscribersOnly: false, // Always PPV
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save stream');
      }

      const data = await response.json();
      onSaved(data.vodId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Save Stream Replay" size="lg">
      <form onSubmit={handleSave} className="space-y-5">
        {/* Title */}
        <GlassInput
          label="VOD Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for this replay..."
          required
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened in this stream..."
            className="w-full px-4 py-3 backdrop-blur-xl bg-white/10 rounded-lg border-2 border-cyan-500/30 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300 resize-none"
            rows={3}
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">
            Price (Coins)
          </label>
          <GlassInput
            type="number"
            value={priceCoins}
            onChange={(e) => setPriceCoins(e.target.value)}
            placeholder="Enter price in coins (0 for free)..."
            min="0"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Set the price viewers must pay to watch this replay. Enter 0 for free access.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <GlassButton
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            disabled={loading}
            className="flex-1 !text-white !bg-white/10 font-semibold border-white/40 hover:!bg-white/20"
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="gradient"
            size="lg"
            disabled={loading}
            shimmer
            glow
            className="flex-1 !text-white font-semibold"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              'Save Stream'
            )}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
}
