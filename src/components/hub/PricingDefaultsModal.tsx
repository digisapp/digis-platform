'use client';

import { useState, useEffect } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { DollarSign, Image, Film, Package, AlertCircle } from 'lucide-react';
import type { PricingDefaults } from '@/hooks/useHubData';

interface PricingDefaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaults: PricingDefaults | null;
  onSave: (defaults: PricingDefaults) => Promise<{ success: boolean; error?: string }>;
}

export function PricingDefaultsModal({ isOpen, onClose, defaults, onSave }: PricingDefaultsModalProps) {
  const [photoPrice, setPhotoPrice] = useState('');
  const [shortVideoPrice, setShortVideoPrice] = useState('');
  const [longVideoPrice, setLongVideoPrice] = useState('');
  const [packDiscount, setPackDiscount] = useState('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaults) {
      setPhotoPrice(defaults.photoPriceCoins?.toString() || '');
      setShortVideoPrice(defaults.shortVideoPriceCoins?.toString() || '');
      setLongVideoPrice(defaults.longVideoPriceCoins?.toString() || '');
      setPackDiscount(defaults.packDiscountPct?.toString() || '30');
    }
  }, [defaults]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const result = await onSave({
      photoPriceCoins: photoPrice ? parseInt(photoPrice) : null,
      shortVideoPriceCoins: shortVideoPrice ? parseInt(shortVideoPrice) : null,
      longVideoPriceCoins: longVideoPrice ? parseInt(longVideoPrice) : null,
      packDiscountPct: parseInt(packDiscount) || 30,
    });

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Default Prices" size="sm">
      <div className="space-y-5">
        <p className="text-gray-400 text-sm">
          Set your default prices. These are applied when you use &quot;Price All&quot; or Quick Drop.
        </p>

        {/* Photo price */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Image className="w-4 h-4 text-cyan-400" />
            Photo price
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="number"
              min="0"
              placeholder="e.g. 5"
              value={photoPrice}
              onChange={(e) => setPhotoPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">coins</span>
          </div>
        </div>

        {/* Short video price */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Film className="w-4 h-4 text-pink-400" />
            Short video price <span className="text-gray-500 font-normal">(&lt; 1 min)</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="number"
              min="0"
              placeholder="e.g. 10"
              value={shortVideoPrice}
              onChange={(e) => setShortVideoPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">coins</span>
          </div>
        </div>

        {/* Long video price */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Film className="w-4 h-4 text-purple-400" />
            Long video price <span className="text-gray-500 font-normal">(1+ min)</span>
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="number"
              min="0"
              placeholder="e.g. 20"
              value={longVideoPrice}
              onChange={(e) => setLongVideoPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">coins</span>
          </div>
        </div>

        {/* Pack discount */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Package className="w-4 h-4 text-yellow-400" />
            Pack discount
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="30"
              value={packDiscount}
              onChange={(e) => setPackDiscount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-8 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
          <p className="text-gray-500 text-xs">Discount applied when selling items as a pack</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving...' : 'Save Defaults'}
        </button>
      </div>
    </GlassModal>
  );
}
