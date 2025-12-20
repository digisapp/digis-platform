'use client';

import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { useToastContext } from '@/context/ToastContext';

interface CreateCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  onCountdownCreated: () => void;
}

export function CreateCountdownModal({ isOpen, onClose, streamId, onCountdownCreated }: CreateCountdownModalProps) {
  const { showError, showSuccess } = useToastContext();
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!label.trim()) {
      showError('Please enter a label');
      return;
    }

    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds < 10) {
      showError('Countdown must be at least 10 seconds');
      return;
    }

    if (totalSeconds > 3600) {
      showError('Countdown cannot exceed 1 hour');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/countdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label.trim(),
          durationSeconds: totalSeconds,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create countdown');
      }

      showSuccess('Countdown started!');
      onCountdownCreated();
      handleClose();
    } catch (error: any) {
      showError(error.message || 'Failed to create countdown');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setLabel('');
    setMinutes(1);
    setSeconds(0);
    onClose();
  };

  const presets = [
    { label: '30s', mins: 0, secs: 30 },
    { label: '1m', mins: 1, secs: 0 },
    { label: '2m', mins: 2, secs: 0 },
    { label: '5m', mins: 5, secs: 0 },
    { label: '10m', mins: 10, secs: 0 },
    { label: '15m', mins: 15, secs: 0 },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative backdrop-blur-xl bg-black/90 rounded-3xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)] p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Start Countdown</h2>
              <p className="text-sm text-gray-400">Create anticipation for your viewers</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Giveaway starts in..."
              maxLength={50}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => {
                const isSelected = minutes === preset.mins && seconds === preset.secs;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMinutes(preset.mins);
                      setSeconds(preset.secs);
                    }}
                    className={`py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-cyan-500/30 border-cyan-500/50 text-cyan-300 border'
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Duration
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Minutes</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <span className="text-2xl text-gray-500 pt-5">:</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Seconds</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center">
              Total: {minutes * 60 + seconds} seconds
            </p>
          </div>

          {/* Submit */}
          <GlassButton
            type="submit"
            variant="gradient"
            size="lg"
            disabled={creating}
            shimmer
            glow
            className="w-full"
          >
            {creating ? 'Starting...' : 'Start Countdown'}
          </GlassButton>
        </form>
      </div>
    </div>
  );
}
