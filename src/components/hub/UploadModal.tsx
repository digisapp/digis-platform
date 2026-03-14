'use client';

import { useState, useRef, useCallback } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Upload, X, Image, Film, AlertCircle } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<{ success: boolean; uploaded?: number; error?: string }>;
  uploading: boolean;
}

const MAX_FILES = 50;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';

export function UploadModal({ isOpen, onClose, onUpload, uploading }: UploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ uploaded: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((files: File[]) => {
    setError('');
    setResult(null);

    const valid = files.filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (valid.length === 0) {
      setError('No supported files found');
      return;
    }

    if (valid.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files per upload`);
      return;
    }

    setSelectedFiles(valid);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setError('');

    const res = await onUpload(selectedFiles);
    if (res.success) {
      setResult({ uploaded: res.uploaded || selectedFiles.length });
      setSelectedFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    } else {
      setError(res.error || 'Upload failed');
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setError('');
      setResult(null);
      onClose();
    }
  };

  const photos = selectedFiles.filter(f => f.type.startsWith('image/')).length;
  const videos = selectedFiles.filter(f => f.type.startsWith('video/')).length;
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Upload to Hub" size="sm">
      <div className="space-y-6">
        {/* Upload area */}
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-cyan-500/30 hover:border-cyan-500/60'
          }`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${dragging ? 'text-cyan-300' : 'text-cyan-400'}`} />
          <p className="text-white font-medium">
            {dragging ? 'Drop files here' : 'Select photos & videos'}
          </p>
          <p className="text-gray-400 text-sm mt-1">JPG, PNG, GIF, WebP, MP4, MOV, WebM</p>
          <p className="text-gray-500 text-xs mt-1">Up to {MAX_FILES} files · drag & drop or tap</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Selected files summary */}
        {selectedFiles.length > 0 && (
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">{selectedFiles.length} files selected</span>
              <button
                onClick={() => { setSelectedFiles([]); if (inputRef.current) inputRef.current.value = ''; }}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              {photos > 0 && (
                <span className="flex items-center gap-1">
                  <Image className="w-3.5 h-3.5" /> {photos} photos
                </span>
              )}
              {videos > 0 && (
                <span className="flex items-center gap-1">
                  <Film className="w-3.5 h-3.5" /> {videos} videos
                </span>
              )}
              <span>{formatSize(totalSize)}</span>
            </div>
          </div>
        )}

        {/* Success result */}
        {result && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-green-400 font-medium">{result.uploaded} items uploaded to Hub</p>
            <p className="text-gray-400 text-sm mt-1">Everything is saved as Private. Price and publish when you&apos;re ready.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Upload button */}
        {selectedFiles.length > 0 && !result && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} items`}
          </button>
        )}

        {/* Info text */}
        <p className="text-gray-500 text-xs text-center">
          All uploads are private by default. No one sees them until you publish.
        </p>
      </div>
    </GlassModal>
  );
}
