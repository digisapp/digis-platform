'use client';

import { useState, useEffect } from 'react';
import { XCircle, Clock, X } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface Countdown {
  id: string;
  label: string;
  endsAt: string;
  isActive: boolean;
}

interface StreamCountdownProps {
  countdown: Countdown;
  isBroadcaster?: boolean;
  streamId: string;
  onCountdownEnded?: () => void;
}

export function StreamCountdown({ countdown, isBroadcaster = false, streamId, onCountdownEnded }: StreamCountdownProps) {
  const { showError } = useToastContext();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Countdown timer
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(countdown.endsAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && countdown.isActive) {
        onCountdownEnded?.();
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [countdown.endsAt, countdown.isActive, onCountdownEnded]);

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/countdown`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel countdown');
      }

      onCountdownEnded?.();
    } catch (error: any) {
      showError(error.message || 'Failed to cancel countdown');
    } finally {
      setCanceling(false);
      setShowCancelConfirm(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isEnded = !countdown.isActive || timeLeft === 0;

  const getProgressColor = () => {
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-cyan-400';
  };

  const getProgressBgColor = () => {
    if (timeLeft <= 10) return 'bg-red-500';
    if (timeLeft <= 30) return 'bg-yellow-500';
    return 'bg-cyan-500';
  };

  if (isEnded) {
    return null;
  }

  return (
    <>
      {/* Tron-themed Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div className="relative bg-black/95 rounded-2xl border border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.3)] p-5 max-w-xs w-full">
            {/* Tron glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-white mb-1">Cancel Countdown?</h3>
              <p className="text-gray-400 text-sm">This will stop the timer for all viewers.</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Keep Running
              </button>
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold hover:from-red-600 hover:to-pink-600 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
              >
                {canceling ? 'Canceling...' : 'Cancel Timer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Countdown Display */}
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-cyan-500/40 p-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-4 h-4 ${getProgressColor()}`} />
            <span className="text-cyan-400 font-semibold text-xs uppercase tracking-wider">Timer</span>
          </div>
          {isBroadcaster && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={canceling}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title="Cancel countdown"
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>

        {/* Label */}
        <h4 className="text-white font-semibold text-sm mb-2 text-center truncate">{countdown.label}</h4>

        {/* Timer Display */}
        <div className="flex justify-center">
          <div className={`text-3xl font-mono font-bold ${getProgressColor()} tabular-nums`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${getProgressBgColor()}`}
            style={{
              width: timeLeft <= 10 ? `${(timeLeft / 10) * 100}%` : '100%',
            }}
          />
        </div>
      </div>
    </>
  );
}
