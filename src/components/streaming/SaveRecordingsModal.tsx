'use client';

import { useState } from 'react';
import { X, Video, Coins, Trash2, Save, Upload, AlertCircle, Check } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { StreamRecording } from '@/hooks/useStreamRecorder';

interface RecordingToSave {
  recording: StreamRecording;
  title: string;
  price: number;
  status: 'pending' | 'uploading' | 'saved' | 'error';
  error?: string;
}

interface SaveRecordingsModalProps {
  recordings: StreamRecording[];
  streamId: string;
  onClose: () => void;
  onSaveComplete: () => void;
  formatDuration: (seconds: number) => string;
}

const MIN_PRICE = 25;
const PRICE_OPTIONS = [25, 50, 100, 200, 500, 1000];

export function SaveRecordingsModal({
  recordings,
  streamId,
  onClose,
  onSaveComplete,
  formatDuration,
}: SaveRecordingsModalProps) {
  const [recordingsToSave, setRecordingsToSave] = useState<RecordingToSave[]>(
    recordings.map((rec) => ({
      recording: rec,
      title: `Stream Recording ${formatDuration(rec.duration)}`,
      price: MIN_PRICE,
      status: 'pending',
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const updateRecording = (id: string, updates: Partial<RecordingToSave>) => {
    setRecordingsToSave((prev) =>
      prev.map((r) => (r.recording.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteRecording = (id: string) => {
    setRecordingsToSave((prev) => prev.filter((r) => r.recording.id !== id));
  };

  const handleSave = async (recordingToSave: RecordingToSave) => {
    const { recording, title, price } = recordingToSave;

    updateRecording(recording.id, { status: 'uploading' });

    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('video', recording.blob, `recording-${recording.id}.webm`);
      formData.append('title', title);
      formData.append('price', price.toString());
      formData.append('duration', recording.duration.toString());
      formData.append('streamId', streamId);

      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save recording');
      }

      updateRecording(recording.id, { status: 'saved' });
      setSavedCount((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to save recording:', err);
      updateRecording(recording.id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to save',
      });
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const pendingRecordings = recordingsToSave.filter((r) => r.status === 'pending');

    for (const recording of pendingRecordings) {
      await handleSave(recording);
    }

    setIsSaving(false);

    // Check if all saved successfully
    const allSaved = recordingsToSave.every(
      (r) => r.status === 'saved' || recordingsToSave.length === 0
    );
    if (allSaved) {
      setTimeout(() => {
        onSaveComplete();
      }, 1000);
    }
  };

  const handleDeleteAll = () => {
    onClose();
  };

  const pendingCount = recordingsToSave.filter((r) => r.status === 'pending').length;
  const allSaved = savedCount === recordings.length && recordings.length > 0;

  if (recordings.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-md bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.2)] p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Recordings</h2>
            <p className="text-gray-400 mb-6">
              You didn't record any moments from this stream.
            </p>
            <GlassButton variant="ghost" onClick={onClose}>
              Close
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30">
                <Video className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Save Your Recordings</h2>
                <p className="text-sm text-gray-400">
                  {recordings.length} recording{recordings.length !== 1 ? 's' : ''} ready to publish
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recordings List */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          {recordingsToSave.map((item, index) => (
            <div
              key={item.recording.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'saved'
                  ? 'bg-green-500/10 border-green-500/30'
                  : item.status === 'error'
                  ? 'bg-red-500/10 border-red-500/30'
                  : item.status === 'uploading'
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Thumbnail/Preview */}
                <div className="w-24 h-16 bg-black rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <video
                    src={item.recording.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className="text-xs text-cyan-400 font-medium">
                      {formatDuration(item.recording.duration)}
                    </span>
                    {item.status === 'saved' && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Check className="w-3 h-3" /> Saved
                      </span>
                    )}
                    {item.status === 'uploading' && (
                      <span className="flex items-center gap-1 text-xs text-cyan-400">
                        <LoadingSpinner size="sm" /> Uploading...
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertCircle className="w-3 h-3" /> {item.error}
                      </span>
                    )}
                  </div>

                  {/* Title Input */}
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateRecording(item.recording.id, { title: e.target.value })}
                    disabled={item.status !== 'pending'}
                    placeholder="Recording title..."
                    className="w-full px-3 py-2 mb-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                    maxLength={100}
                  />

                  {/* Price Selection */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    {PRICE_OPTIONS.map((price) => (
                      <button
                        key={price}
                        onClick={() => updateRecording(item.recording.id, { price })}
                        disabled={item.status !== 'pending'}
                        className={`px-2 py-1 text-xs rounded-full transition-all ${
                          item.price === price
                            ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
                        } disabled:opacity-50`}
                      >
                        {price}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={MIN_PRICE}
                      value={item.price}
                      onChange={(e) =>
                        updateRecording(item.recording.id, {
                          price: Math.max(MIN_PRICE, parseInt(e.target.value) || MIN_PRICE),
                        })
                      }
                      disabled={item.status !== 'pending'}
                      className="w-20 px-2 py-1 bg-black/30 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                {item.status === 'pending' && (
                  <button
                    onClick={() => deleteRecording(item.recording.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="px-6 pb-4">
          <div className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
            <p className="text-yellow-300 text-xs font-medium flex items-center gap-2">
              <Coins className="w-4 h-4" />
              All recordings are PPV (min {MIN_PRICE} coins). Recordings with 0 purchases after 60 days are auto-deleted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex flex-row gap-3">
          <GlassButton
            variant="ghost"
            onClick={handleDeleteAll}
            disabled={isSaving || allSaved}
            className="flex-1 whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </GlassButton>
          <GlassButton
            variant="gradient"
            onClick={allSaved ? onSaveComplete : handleSaveAll}
            disabled={isSaving || pendingCount === 0}
            className="flex-1 whitespace-nowrap"
            shimmer
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : allSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Done
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Save Recording{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
