'use client';

import { useState, useEffect } from 'react';
import { XCircle, Clock } from 'lucide-react';
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
    if (!confirm('Cancel this countdown?')) return;

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

  // Calculate progress percentage for the circular indicator
  const getProgressColor = () => {
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-purple-400';
  };

  if (isEnded) {
    return null; // Don't show ended countdowns
  }

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-2xl border border-purple-500/40 p-6 shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse-slow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${getProgressColor()}`} />
          <span className="text-purple-400 font-semibold text-sm uppercase tracking-wider">Countdown</span>
        </div>
        {isBroadcaster && (
          <button
            onClick={handleCancel}
            disabled={canceling}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            title="Cancel countdown"
          >
            <XCircle className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>

      {/* Label */}
      <h4 className="text-white font-bold text-lg mb-4 text-center">{countdown.label}</h4>

      {/* Timer Display */}
      <div className="flex justify-center">
        <div className={`text-5xl font-mono font-bold ${getProgressColor()} tabular-nums`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 10 ? 'bg-red-500' : timeLeft <= 30 ? 'bg-yellow-500' : 'bg-purple-500'
          }`}
          style={{
            width: timeLeft <= 10 ? `${(timeLeft / 10) * 100}%` : '100%',
          }}
        />
      </div>
    </div>
  );
}
