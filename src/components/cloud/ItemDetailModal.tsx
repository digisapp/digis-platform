'use client';

import { useState } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Lock, Eye, Check, DollarSign, Trash2, Play, AlertCircle } from 'lucide-react';
import type { CloudItem } from '@/hooks/useCloudData';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CloudItem | null;
  onUpdate: (id: string, updates: { priceCoins?: number | null; status?: string }) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const statusOptions = [
  { value: 'private', label: 'Private', icon: Lock, color: 'text-gray-400', bg: 'bg-gray-500/20' },
  { value: 'live', label: 'Live', icon: Eye, color: 'text-green-400', bg: 'bg-green-500/20' },
];

export function ItemDetailModal({ isOpen, onClose, item, onUpdate, onDelete }: ItemDetailModalProps) {
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  // Sync price input when item changes
  if (item && price === '' && item.priceCoins) {
    setPrice(item.priceCoins.toString());
  }

  if (!item) return null;

  const handleStatusChange = async (status: string) => {
    setSaving(true);
    setError('');

    const updates: any = { status };
    // If going live and no price set, try to use the input value
    if (status === 'live' && !item.priceCoins) {
      const p = parseInt(price);
      if (!p || p <= 0) {
        setError('Set a price before going live');
        setSaving(false);
        return;
      }
      updates.priceCoins = p;
    }

    const result = await onUpdate(item.id, updates);
    if (!result.success) setError(result.error || 'Failed to update');
    setSaving(false);
  };

  const handlePriceSave = async () => {
    const p = parseInt(price);
    if (isNaN(p) || p < 0) {
      setError('Enter a valid price');
      return;
    }
    setSaving(true);
    setError('');
    const result = await onUpdate(item.id, { priceCoins: p || null });
    if (!result.success) setError(result.error || 'Failed to update');
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
    setPrice('');
    setError('');
    setConfirmDelete(false);
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Item Details" size="sm">
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
        <div className="flex gap-4 text-sm text-gray-400">
          <span className="capitalize">{item.type}</span>
          {item.sizeBytes && <span>{formatSize(item.sizeBytes)}</span>}
          <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
        </div>

        {/* Price input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Price</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                min="0"
                placeholder="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/40"
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
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-300">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map(opt => {
              const Icon = opt.icon;
              const isActive = item.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  disabled={saving}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    isActive
                      ? `${opt.bg} border-white/20`
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? opt.color : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
              Delete item
            </button>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
