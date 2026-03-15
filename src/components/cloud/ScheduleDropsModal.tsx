'use client';

import { useState } from 'react';
import { GlassModal } from '@/components/ui/GlassModal';
import { Calendar, Clock, Zap, AlertCircle } from 'lucide-react';

interface ScheduleDropsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedItemIds: string[];
}

export function ScheduleDropsModal({ isOpen, onClose, selectedCount, selectedItemIds }: ScheduleDropsModalProps) {
  const [frequency, setFrequency] = useState<'daily' | 'twice_daily'>('daily');
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ daysSpan: number; firstDrop: string; lastDrop: string } | null>(null);

  const daysSpan = Math.ceil(selectedCount / (frequency === 'twice_daily' ? 2 : 1));

  const handleSchedule = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/cloud/drops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItemIds,
          frequency,
          startDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({
          daysSpan: data.daysSpan,
          firstDrop: data.firstDrop,
          lastDrop: data.lastDrop,
        });
      } else {
        setError(data.error || 'Failed to schedule drops');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }

    setLoading(false);
  };

  const handleClose = () => {
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Schedule" size="sm">
      <div className="space-y-5">
        {result ? (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-white font-semibold text-lg">Drops scheduled!</p>
            <p className="text-gray-400 text-sm">
              {selectedCount} items will drop over {result.daysSpan} days
            </p>
            <p className="text-gray-500 text-xs">
              {new Date(result.firstDrop).toLocaleDateString()} — {new Date(result.lastDrop).toLocaleDateString()}
            </p>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all mt-4"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Item count */}
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{selectedCount}</p>
              <p className="text-gray-400 text-sm">items to schedule</p>
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFrequency('daily')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    frequency === 'daily'
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  1 per day
                </button>
                <button
                  onClick={() => setFrequency('twice_daily')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    frequency === 'twice_daily'
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-white'
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  2 per day
                </button>
              </div>
            </div>

            {/* Start date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/40 [color-scheme:dark]"
              />
            </div>

            {/* Preview */}
            <div className="bg-white/5 rounded-xl p-4 space-y-1">
              <p className="text-gray-300 text-sm font-medium">Preview</p>
              <p className="text-gray-400 text-sm">
                {selectedCount} drops over {daysSpan} days
              </p>
              <p className="text-gray-500 text-xs">
                Fans get notified on each drop
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleSchedule}
              disabled={loading || selectedCount === 0}
              className="w-full py-3 rounded-xl font-semibold text-black bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 disabled:opacity-50 transition-all"
            >
              {loading ? 'Scheduling...' : `Schedule ${selectedCount} drops`}
            </button>
          </>
        )}
      </div>
    </GlassModal>
  );
}
