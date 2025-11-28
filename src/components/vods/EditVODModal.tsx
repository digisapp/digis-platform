'use client';

import { useState, useEffect } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Edit3, DollarSign, Lock, Globe, Users } from 'lucide-react';

interface VOD {
  id: string;
  title: string;
  description: string | null;
  priceCoins: number;
  isPublic: boolean;
  subscribersOnly: boolean;
}

interface EditVODModalProps {
  vod: VOD;
  onClose: () => void;
  onSuccess?: () => void;
}

type AccessType = 'subscribers' | 'ppv' | 'public';

const ACCESS_OPTIONS = [
  {
    value: 'subscribers' as AccessType,
    label: 'Subscribers Only',
    description: 'Free for subscribers, PPV for others',
    icon: Users,
  },
  {
    value: 'ppv' as AccessType,
    label: 'Pay-Per-View',
    description: 'Everyone pays (including subscribers)',
    icon: Lock,
  },
  {
    value: 'public' as AccessType,
    label: 'Public & Free',
    description: 'Anyone can watch for free',
    icon: Globe,
  },
];

const PRICING_PRESETS = [
  { label: 'Free for Subscribers', value: 0 },
  { label: '1 Coin', value: 1 },
  { label: '5 Coins', value: 5 },
  { label: '10 Coins', value: 10 },
  { label: '20 Coins', value: 20 },
  { label: 'Custom', value: -1 },
];

export function EditVODModal({ vod, onClose, onSuccess }: EditVODModalProps) {
  const [title, setTitle] = useState(vod.title);
  const [description, setDescription] = useState(vod.description || '');
  const [priceCoins, setPriceCoins] = useState(vod.priceCoins);
  const [customPrice, setCustomPrice] = useState('');
  const [accessType, setAccessType] = useState<AccessType>(
    vod.isPublic ? 'public' : vod.subscribersOnly ? 'subscribers' : 'ppv'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update price when preset changes
  useEffect(() => {
    const preset = PRICING_PRESETS.find((p) => p.value === priceCoins);
    if (!preset || preset.value !== -1) {
      setCustomPrice('');
    }
  }, [priceCoins]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // Determine final price based on access type
    let finalPrice = priceCoins;
    if (accessType === 'public') {
      finalPrice = 0;
    } else if (accessType === 'subscribers' && priceCoins === -1) {
      finalPrice = parseInt(customPrice) || 0;
    } else if (accessType === 'ppv' && priceCoins === -1) {
      finalPrice = parseInt(customPrice) || 0;
    }

    if (finalPrice < 0) {
      setError('Price cannot be negative');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/vods/${vod.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priceCoins: finalPrice,
          isPublic: accessType === 'public',
          subscribersOnly: accessType === 'subscribers',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update VOD');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update VOD');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl border-2 border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.3)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-100 to-white bg-clip-text text-transparent">
                Edit VOD
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter VOD title"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description (optional)"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                maxLength={500}
              />
            </div>

            {/* Access Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Access Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ACCESS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = accessType === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setAccessType(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/10 bg-white/5 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-400' : 'text-gray-400'}`} />
                        <span className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pricing (only for subscribers and ppv) */}
            {accessType !== 'public' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Pricing
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PRICING_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setPriceCoins(preset.value)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        priceCoins === preset.value
                          ? 'border-cyan-500 bg-cyan-500/20'
                          : 'border-white/10 bg-white/5 hover:border-cyan-500/50'
                      }`}
                    >
                      <span className={`font-semibold ${priceCoins === preset.value ? 'text-white' : 'text-gray-300'}`}>
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom Price Input */}
                {priceCoins === -1 && (
                  <div className="mt-3">
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="Enter custom price"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        coins
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border-2 border-purple-500/30 p-4">
              <h3 className="text-sm font-bold text-white mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Access Type</span>
                  <span className="text-white font-semibold">
                    {ACCESS_OPTIONS.find((o) => o.value === accessType)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price</span>
                  <span className="text-cyan-400 font-bold">
                    {accessType === 'public'
                      ? 'Free'
                      : priceCoins === -1
                      ? `${customPrice || 0} coins`
                      : `${priceCoins} coins`}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 border border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
