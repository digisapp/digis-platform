'use client';

import { useState } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Eye, AlertCircle, Lock, Coins } from 'lucide-react';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedItemIds: string[];
  onBulkSetStatus: (itemIds: string[], status: string) => Promise<{ success: boolean; error?: string }>;
  onBulkSetPrice: (itemIds: string[], price: number) => Promise<{ success: boolean; error?: string }>;
}

type Tab = 'publish' | 'price';

export function BulkActionsModal({
  isOpen,
  onClose,
  selectedCount,
  selectedItemIds,
  onBulkSetStatus,
  onBulkSetPrice,
}: BulkActionsModalProps) {
  const [tab, setTab] = useState<Tab>('publish');
  const [targetStatus, setTargetStatus] = useState<'live' | 'private'>('live');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    const result = await onBulkSetStatus(selectedItemIds, targetStatus);
    if (result.success) {
      setSuccess(`${selectedCount} items set to ${targetStatus}`);
      setTimeout(() => { onClose(); setSuccess(''); }, 1200);
    } else {
      setError(result.error || 'Failed to update');
    }
    setLoading(false);
  };

  const handleSetPrice = async () => {
    const coins = parseInt(price);
    if (!coins || coins <= 0) {
      setError('Enter a valid price');
      return;
    }
    setLoading(true);
    setError('');
    const result = await onBulkSetPrice(selectedItemIds, coins);
    if (result.success) {
      setSuccess(`Price set for ${selectedCount} items`);
      setTimeout(() => { onClose(); setSuccess(''); setPrice(''); }, 1200);
    } else {
      setError(result.error || 'Failed to update prices');
    }
    setLoading(false);
  };

  const statusOptions = [
    { value: 'live' as const, label: 'Live', icon: Eye, description: 'Visible to fans, ready to buy', color: 'green' },
    { value: 'private' as const, label: 'Private', icon: Lock, description: 'Hidden, only you can see', color: 'gray' },
  ];

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Bulk Actions" size="sm">
      <div className="space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => { setTab('publish'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'publish' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Set Status
          </button>
          <button
            onClick={() => { setTab('price'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'price' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Coins className="w-4 h-4" />
            Set Price
          </button>
        </div>

        <p className="text-gray-400 text-sm text-center">
          {selectedCount} items selected
        </p>

        {tab === 'publish' ? (
          <>
            <div className="space-y-2">
              {statusOptions.map(opt => {
                const Icon = opt.icon;
                const isActive = targetStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTargetStatus(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-500/30'
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <div>
                      <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {success ? (
              <div className="text-center text-green-400 font-medium bg-green-500/10 rounded-xl p-3">
                {success}
              </div>
            ) : (
              <button
                onClick={handlePublish}
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-50 transition-all"
              >
                {loading ? 'Updating...' : `Set ${selectedCount} items to ${targetStatus}`}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Price per item</label>
              <div className="relative">
                <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-16 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">coins</span>
              </div>
              {price && parseInt(price) > 0 && (
                <p className="text-xs text-gray-500">
                  You earn <span className="text-green-400 font-medium">${(parseInt(price) * 0.10).toFixed(2)}</span> USD per item
                </p>
              )}
            </div>

            {success ? (
              <div className="text-center text-green-400 font-medium bg-green-500/10 rounded-xl p-3">
                {success}
              </div>
            ) : (
              <button
                onClick={handleSetPrice}
                disabled={loading || !price}
                className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-50 transition-all"
              >
                {loading ? 'Updating...' : `Set price for ${selectedCount} items`}
              </button>
            )}
          </>
        )}

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
