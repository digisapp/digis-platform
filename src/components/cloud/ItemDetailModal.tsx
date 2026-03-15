'use client';

import { useState, useRef } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Lock, Eye, Trash2, Play, AlertCircle, Coins, Check } from 'lucide-react';
import type { CloudItem } from '@/hooks/useCloudData';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CloudItem | null;
  onUpdate: (id: string, updates: { priceCoins?: number | null; status?: string }) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const statusOptions = [
  { value: 'private', label: 'Private', icon: Lock, color: 'text-gray-400', bg: 'bg-gray-500/20', desc: 'Only you can see' },
  { value: 'live', label: 'Live', icon: Eye, color: 'text-green-400', bg: 'bg-green-500/20', desc: 'Visible to fans' },
] as const;

export function ItemDetailModal({ isOpen, onClose, item, onUpdate, onDelete }: ItemDetailModalProps) {
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const lastItemId = useRef<string | null>(null);

  // Reset price input when item changes
  if (item && item.id !== lastItemId.current) {
    lastItemId.current = item.id;
    setPrice(item.priceCoins ? item.priceCoins.toString() : '');
    setError('');
    setSuccess('');
    setConfirmDelete(false);
  }

  if (!item) return null;

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleStatusChange = async (status: string) => {
    setSaving(true);
    setError('');

    const updates: any = { status };
    // If going live, also send the current price input value if set
    if (status === 'live' && !item.priceCoins) {
      const p = parseInt(price);
      if (p > 0) updates.priceCoins = p;
    }

    const result = await onUpdate(item.id, updates);
    if (result.success) {
      showSuccess(status === 'live' ? 'Now live!' : 'Set to private');
    } else {
      setError(result.error || 'Failed to update');
    }
    setSaving(false);
  };

  const handlePriceSave = async () => {
    const p = parseInt(price);
    if (price !== '' && price !== '0' && (isNaN(p) || p < 0)) {
      setError('Enter a valid price');
      return;
    }
    setSaving(true);
    setError('');
    const coins = (!price || p === 0) ? null : p;
    const result = await onUpdate(item.id, { priceCoins: coins });
    if (result.success) {
      showSuccess(coins ? 'Price saved' : 'Set to free');
    } else {
      setError(result.error || 'Failed to update');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await onDelete(item.id);
    if (result.success) {
      onClose();
      setConfirmDelete(false);
    } else {
      setError(result.error || 'Failed to delete');
    }
    setDeleting(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const handleClose = () => {
    lastItemId.current = null;
    setPrice('');
    setError('');
    setSuccess('');
    setConfirmDelete(false);
    onClose();
  };

  const title = item.type === 'video' ? 'Video Details' : 'Photo Details';

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-5">
        {/* Preview */}
        <div className="relative rounded-xl overflow-hidden aspect-[3/4] max-h-[300px]">
          {item.type === 'video' ? (
            <video
              src={item.fileUrl}
              className="w-full h-full object-cover"
              controls
              playsInline
            />
          ) : (
            <img
              src={item.fileUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          {item.type === 'video' && item.durationSeconds && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white">
              <Play className="w-3 h-3 fill-white" />
              {Math.floor(item.durationSeconds / 60)}:{(item.durationSeconds % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Info */}
        {item.sizeBytes && (
          <p className="text-sm text-gray-400">{formatSize(item.sizeBytes)}</p>
        )}

        {/* Price input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Price</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
              <input
                type="number"
                min="0"
                placeholder="Free"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-16 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">coins</span>
            </div>
            <button
              onClick={handlePriceSave}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
          {price && parseInt(price) > 0 && (
            <p className="text-xs text-gray-500">
              You earn <span className="text-green-400 font-medium">${(parseInt(price) * 0.10).toFixed(2)}</span> USD
            </p>
          )}
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map(opt => {
              const Icon = opt.icon;
              const isActive = item.status === opt.value;
              const hasNoPrice = !item.priceCoins && !parseInt(price);
              const liveDesc = opt.value === 'live' && hasNoPrice && item.status !== 'live'
                ? 'Will go live as free'
                : opt.desc;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={saving}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? `${opt.bg} border-white/20`
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? opt.color : 'text-gray-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-gray-600">{liveDesc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Success toast */}
        {success && (
          <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 rounded-xl p-3">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Delete */}
        <div className="pt-2 border-t border-white/10">
          {confirmDelete ? (
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
