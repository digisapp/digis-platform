'use client';

import { useState, useRef, useCallback } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Upload, X, Image, Film, AlertCircle, Check, RotateCcw, Loader2 } from 'lucide-react';
import { useUploadQueue, QueueItem, UploadStatus } from '@/hooks/useUploadQueue';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void; // Called after items are registered to refresh the grid
}

const MAX_FILES = 50;
const ACCEPTED_TYPES = 'image/*,video/*';

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const STATUS_CONFIG: Record<UploadStatus, { label: string; color: string }> = {
  local_queued: { label: 'Queued', color: 'text-gray-400' },
  uploading: { label: 'Uploading', color: 'text-cyan-400' },
  uploaded: { label: 'Uploaded', color: 'text-cyan-400' },
  registering: { label: 'Saving', color: 'text-cyan-400' },
  processing: { label: 'Processing', color: 'text-yellow-400' },
  ready: { label: 'Done', color: 'text-green-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
};

export function UploadModal({ isOpen, onClose, onUploadComplete }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadQueue = useUploadQueue();

  const handleAddFiles = useCallback((files: File[]) => {
    setError('');

    const valid = files.filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (valid.length === 0) {
      setError('No supported files found');
      return;
    }

    if (valid.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files per batch`);
      return;
    }

    uploadQueue.addFiles(valid);
  }, [uploadQueue]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleAddFiles(Array.from(e.target.files || []));
    if (inputRef.current) inputRef.current.value = '';
  }, [handleAddFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleAddFiles(Array.from(e.dataTransfer.files));
  }, [handleAddFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleClose = () => {
    // Allow close even during upload — queue continues in background
    if (onUploadComplete && uploadQueue.stats.completed > 0) {
      onUploadComplete();
    }
    onClose();
  };

  const { queue, stats } = uploadQueue;
  const hasItems = queue.length > 0;
  const allDone = hasItems && stats.queued === 0 && stats.uploading === 0 && stats.processing === 0;

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Upload to Cloud" size="sm">
      <div className="space-y-5">
        {/* Drop zone — always visible to add more files */}
        <div
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-cyan-500/30 hover:border-cyan-500/60'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className={`w-8 h-8 mx-auto mb-3 ${dragging ? 'text-cyan-300' : 'text-cyan-400'}`} />
          <p className="text-white font-bold text-base">
            {dragging ? 'Drop files here' : 'Upload Pictures and Videos Separately'}
          </p>
          <p className="text-gray-400 text-sm mt-2 font-medium">Tap to select your files</p>
          <p className="text-gray-500 text-xs mt-1">Videos may take a moment to prepare on iPhone</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Queue summary bar */}
        {hasItems && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3 text-gray-400">
              {stats.uploading > 0 && (
                <span className="flex items-center gap-1 text-cyan-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {stats.uploading + stats.queued} uploading
                </span>
              )}
              {stats.completed > 0 && (
                <span className="flex items-center gap-1 text-green-400">
                  <Check className="w-3.5 h-3.5" />
                  {stats.completed} done
                </span>
              )}
              {stats.failed > 0 && (
                <span className="text-red-400">{stats.failed} failed</span>
              )}
            </div>
            {allDone && (
              <button
                onClick={() => { uploadQueue.clearAll(); onUploadComplete?.(); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* File list */}
        {hasItems && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {queue.map(item => (
              <QueueItemRow
                key={item.id}
                item={item}
                onRetry={() => uploadQueue.retryItem(item.id)}
                onRemove={() => uploadQueue.removeItem(item.id)}
              />
            ))}
          </div>
        )}

        {/* Large batch warning */}
        {hasItems && stats.total > 10 && stats.queued > 0 && (
          <p className="text-yellow-500/80 text-xs text-center">
            {stats.total} files · uploads may take a while on mobile. Digis will resume if interrupted.
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Info text */}
        <p className="text-gray-500 text-xs text-center">
          All uploads are private by default. No one sees them until you publish.
        </p>
      </div>
    </GlassModal>
  );
}

function QueueItemRow({
  item,
  onRetry,
  onRemove,
}: {
  item: QueueItem;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const config = STATUS_CONFIG[item.status];
  const isUploading = item.status === 'uploading';

  return (
    <div className="flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-2">
      {/* Type icon */}
      <div className="flex-shrink-0">
        {item.type === 'photo' ? (
          <Image className="w-4 h-4 text-blue-400" />
        ) : (
          <Film className="w-4 h-4 text-purple-400" />
        )}
      </div>

      {/* File info + progress */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs truncate">{item.fileName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-gray-500 text-xs">{formatSize(item.fileSize)}</span>
          <span className={`text-xs ${config.color}`}>
            {item.status === 'failed' && item.error ? item.error : config.label}
          </span>
        </div>
        {/* Progress bar */}
        {isUploading && (
          <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon / actions */}
      <div className="flex-shrink-0">
        {item.status === 'ready' && (
          <Check className="w-4 h-4 text-green-400" />
        )}
        {item.status === 'failed' && item.file && (
          <button onClick={onRetry} className="p-1 text-gray-400 hover:text-cyan-400 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {item.status === 'failed' && !item.file && (
          <button onClick={onRemove} className="p-1 text-gray-400 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {(item.status === 'uploading' || item.status === 'registering' || item.status === 'processing' || item.status === 'uploaded') && (
          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        )}
      </div>
    </div>
  );
}
