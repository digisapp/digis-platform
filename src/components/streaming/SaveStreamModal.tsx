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

const PRICING_PRESETS = [
  { label: 'Free for Subscribers', value: 0, description: 'Only your subscribers can watch' },
  { label: '10 Coins', value: 10, description: 'Budget-friendly access' },
  { label: '25 Coins', value: 25, description: 'Standard pricing' },
  { label: '50 Coins', value: 50, description: 'Premium content' },
  { label: '100 Coins', value: 100, description: 'Exclusive replay' },
  { label: 'Custom', value: -1, description: 'Set your own price' },
];

const ACCESS_OPTIONS = [
  { value: 'subscribers', label: 'Subscribers Only', description: 'Free for subscribers, PPV for others' },
  { value: 'ppv', label: 'Pay-Per-View', description: 'Everyone pays (including subscribers)' },
  { value: 'public', label: 'Public & Free', description: 'Anyone can watch for free' },
];

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
  const [selectedPricing, setSelectedPricing] = useState(0); // Default: Free for subscribers
  const [customPrice, setCustomPrice] = useState('');
  const [accessType, setAccessType] = useState('subscribers');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Determine final price
      let finalPrice = selectedPricing;
      if (selectedPricing === -1) {
        finalPrice = parseInt(customPrice) || 0;
        if (finalPrice < 0) {
          throw new Error('Price must be 0 or greater');
        }
      }

      const response = await fetch(`/api/streams/${streamId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priceCoins: finalPrice,
          isPublic: accessType === 'public',
          subscribersOnly: accessType === 'subscribers',
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
    <GlassModal isOpen={isOpen} onClose={onClose} title="💾 Save Stream Replay" size="lg">
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

        {/* Access Type */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Access Type
          </label>
          <div className="space-y-2">
            {ACCESS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  accessType === option.value
                    ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                    : 'border-cyan-500/30 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="accessType"
                  value={option.value}
                  checked={accessType === option.value}
                  onChange={(e) => setAccessType(e.target.value)}
                  className="mt-1 w-4 h-4 text-cyan-400 focus:ring-cyan-400"
                />
                <div className="flex-1">
                  <div className="font-bold text-white">{option.label}</div>
                  <div className="text-sm text-gray-300 mt-1">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Pricing (only if not public) */}
        {accessType !== 'public' && (
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              {accessType === 'subscribers' ? 'Price for Non-Subscribers' : 'Price for Everyone'}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PRICING_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSelectedPricing(preset.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedPricing === preset.value
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                      : 'border-cyan-500/30 bg-white/5 hover:border-cyan-400/50'
                  }`}
                >
                  <div className="font-bold text-white text-sm">{preset.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{preset.description}</div>
                </button>
              ))}
            </div>

            {/* Custom Price Input */}
            {selectedPricing === -1 && (
              <div className="mt-3">
                <GlassInput
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Enter custom price in coins..."
                  min="0"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30">
          <h4 className="font-bold text-white mb-2">💡 Summary</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            {accessType === 'public' && (
              <li>✓ Anyone can watch this replay for free</li>
            )}
            {accessType === 'subscribers' && (
              <>
                <li>✓ Your subscribers can watch for free</li>
                <li>✓ Others pay {selectedPricing === -1 ? customPrice || '0' : selectedPricing} coins</li>
              </>
            )}
            {accessType === 'ppv' && (
              <li>✓ Everyone pays {selectedPricing === -1 ? customPrice || '0' : selectedPricing} coins to watch</li>
            )}
            <li>✓ You can edit or delete this anytime</li>
            <li>✓ Earnings go directly to your wallet</li>
          </ul>
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
            className="flex-1 !text-white font-semibold border-white/20 hover:bg-white/10"
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
            className="flex-1 text-gray-900 font-semibold"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              '💾 Save Stream'
            )}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
}
