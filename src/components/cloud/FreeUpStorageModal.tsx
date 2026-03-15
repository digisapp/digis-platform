'use client';

import { useState, useEffect } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { HardDrive, Check, Image, Film, Shield, ChevronRight } from 'lucide-react';

interface StorageItem {
  id: string;
  type: 'photo' | 'video';
  thumbnailUrl: string | null;
  sizeBytes: number | null;
  status: 'private' | 'ready' | 'live';
  uploadedAt: string;
}

interface FreeUpStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function FreeUpStorageModal({ isOpen, onClose }: FreeUpStorageModalProps) {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'overview' | 'details'>('overview');

  useEffect(() => {
    if (!isOpen) return;
    setStep('overview');
    setLoading(true);

    // Fetch all items to calculate storage
    fetch('/api/cloud/items?limit=500')
      .then(r => r.json())
      .then(data => {
        if (data.items) setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  const totalSize = items.reduce((sum, i) => sum + (i.sizeBytes || 0), 0);
  const photoCount = items.filter(i => i.type === 'photo').length;
  const videoCount = items.filter(i => i.type === 'video').length;
  const photoSize = items.filter(i => i.type === 'photo').reduce((s, i) => s + (i.sizeBytes || 0), 0);
  const videoSize = items.filter(i => i.type === 'video').reduce((s, i) => s + (i.sizeBytes || 0), 0);

  // Sort by size descending for the details view
  const sortedBySize = [...items].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
  const top20 = sortedBySize.slice(0, 20);

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Free Up Phone Storage" size="sm">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {step === 'overview' ? (
            <>
              {/* Big number */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">{formatBytes(totalSize)}</p>
                <p className="text-gray-400 text-sm">safely backed up in Cloud</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Image className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{photoCount} photos</p>
                      <p className="text-gray-500 text-xs">{formatBytes(photoSize)}</p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-green-400" />
                </div>

                <div className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Film className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{videoCount} videos</p>
                      <p className="text-gray-500 text-xs">{formatBytes(videoSize)}</p>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-green-400" />
                </div>
              </div>

              {/* CTA */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
                <p className="text-green-400 text-sm font-medium">
                  All {items.length} items are safely stored
                </p>
                <p className="text-gray-400 text-xs">
                  You can delete these from your phone to free up {formatBytes(totalSize)} of storage. Your content stays safe in Cloud.
                </p>
              </div>

              <button
                onClick={() => setStep('details')}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm"
              >
                <span>See largest files</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm">
                Largest files backed up — safe to delete from phone:
              </p>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {top20.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-2.5">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {item.type === 'photo' ? (
                            <Image className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Film className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm capitalize">{item.type}</p>
                      <p className="text-gray-500 text-xs">{new Date(item.uploadedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 text-sm font-medium">{formatBytes(item.sizeBytes || 0)}</p>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 text-xs">Backed up</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('overview')}
                className="w-full py-3 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/15 transition-all"
              >
                Back to overview
              </button>
            </>
          )}
        </div>
      )}
    </GlassModal>
  );
}
