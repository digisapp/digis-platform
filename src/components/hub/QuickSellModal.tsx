'use client';

import { useState } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Lock, Package, Save, DollarSign, Image, Film, AlertCircle } from 'lucide-react';
import type { PricingDefaults } from '@/hooks/useHubData';

interface QuickSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedItemIds: string[];
  pricingDefaults: PricingDefaults | null;
  onQuickSell: (action: string, itemIds: string[], packTitle?: string, packPrice?: number) => Promise<{ success: boolean; error?: string }>;
}

export function QuickSellModal({
  isOpen,
  onClose,
  selectedCount,
  selectedItemIds,
  pricingDefaults,
  onQuickSell,
}: QuickSellModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [packTitle, setPackTitle] = useState('');

  const hasDefaults = pricingDefaults && (
    pricingDefaults.photoPriceCoins || pricingDefaults.shortVideoPriceCoins || pricingDefaults.longVideoPriceCoins
  );

  const handleAction = async (action: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    const title = packTitle.trim() || undefined;
    const result = await onQuickSell(action, selectedItemIds, title);

    if (result.success) {
      if (action === 'lock_individually') {
        setSuccess(`${selectedCount} items are now live and earning!`);
      } else if (action === 'lock_as_pack') {
        setSuccess('Pack created and live!');
      } else {
        setSuccess('Items saved as private.');
      }
      setTimeout(() => {
        onClose();
        setSuccess('');
        setPackTitle('');
      }, 1500);
    } else {
      setError(result.error || 'Something went wrong');
    }

    setLoading(false);
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Quick Drop" size="sm">
      <div className="space-y-4">
        {/* Selection count */}
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{selectedCount}</p>
          <p className="text-gray-400 text-sm">items selected</p>
        </div>

        {!hasDefaults && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Set your default prices first to use Quick Drop
          </div>
        )}

        {/* Lock Individually */}
        <button
          onClick={() => handleAction('lock_individually')}
          disabled={loading || !hasDefaults}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
        >
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-medium">Lock individually</p>
            <p className="text-gray-400 text-sm">Apply default prices & publish each item</p>
          </div>
        </button>

        {/* Lock as Pack */}
        <div className="space-y-2">
          <button
            onClick={() => handleAction('lock_as_pack')}
            disabled={loading || !hasDefaults}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-pink-500/20 hover:border-pink-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-white font-medium">Lock as Pack</p>
              <p className="text-gray-400 text-sm">Bundle into one pack with discount pricing</p>
            </div>
          </button>
          <input
            type="text"
            placeholder="Pack title (optional)"
            value={packTitle}
            onChange={(e) => setPackTitle(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40"
          />
        </div>

        {/* Save Private */}
        <button
          onClick={() => handleAction('save_private')}
          disabled={loading}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all disabled:opacity-40 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center flex-shrink-0">
            <Save className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-white font-medium">Save for later</p>
            <p className="text-gray-400 text-sm">Keep private — decide later</p>
          </div>
        </button>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-center text-green-400 font-medium bg-green-500/10 rounded-xl p-3">
            {success}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
