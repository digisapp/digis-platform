'use client';

import { useState } from 'react';
import { Scissors, Clock, X, Play, AlertCircle } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ClipCreatorModalProps {
  vodId: string;
  vodTitle: string;
  vodDuration: number; // in seconds
  thumbnailUrl?: string | null;
  onClose: () => void;
  onSuccess: (clip: any) => void;
}

export function ClipCreatorModal({
  vodId,
  vodTitle,
  vodDuration,
  thumbnailUrl,
  onClose,
  onSuccess,
}: ClipCreatorModalProps) {
  const [title, setTitle] = useState(`Clip from ${vodTitle}`);
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CLIP_DURATION = 30; // 30 seconds clips

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse time input like "1:30" or "01:30:00" to seconds
  const parseTimeInput = (input: string): number => {
    const parts = input.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(input) || 0;
  };

  const maxStartTime = Math.max(0, vodDuration - CLIP_DURATION);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your clip');
      return;
    }

    if (startTime > maxStartTime) {
      setError(`Start time is too close to the end. Maximum start time is ${formatTime(maxStartTime)}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vodId,
          title: title.trim(),
          description: description.trim() || null,
          startTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create clip');
      }

      onSuccess(data.clip);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create clip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.2)] animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
              <Scissors className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Clip</h2>
              <p className="text-sm text-gray-400">30-second highlight from your VOD</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Preview */}
          <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden border border-white/10">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={vodTitle}
                className="w-full h-full object-cover opacity-60"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-16 h-16 text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center">
                <p className="text-white text-sm font-medium mb-1">Clip Preview</p>
                <p className="text-cyan-400 text-lg font-bold">
                  {formatTime(startTime)} - {formatTime(Math.min(startTime + CLIP_DURATION, vodDuration))}
                </p>
              </div>
            </div>
          </div>

          {/* Start Time Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Time
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={maxStartTime}
                value={startTime}
                onChange={(e) => setStartTime(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0:00</span>
                <span className="text-cyan-400 font-medium">{formatTime(startTime)}</span>
                <span>{formatTime(vodDuration)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Clip will be {CLIP_DURATION} seconds long
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Clip Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your clip a catchy title..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a short description..."
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors resize-none"
              maxLength={500}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-cyan-500/10 rounded-xl border border-green-500/20">
            <p className="text-green-300 text-sm font-medium flex items-center gap-2">
              <span className="text-lg">🆓</span>
              Clips are FREE for everyone to view
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Great for promoting your content and attracting new fans!
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex gap-3">
          <GlassButton
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="gradient"
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="flex-1"
            shimmer
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Creating...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4" />
                <span>Create Clip</span>
              </div>
            )}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
