'use client';

import { Circle, Square, Video } from 'lucide-react';

interface StreamRecordButtonProps {
  isRecording: boolean;
  currentDuration: string;
  maxDuration: number;
  recordingsCount: number;
  maxRecordings: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export function StreamRecordButton({
  isRecording,
  currentDuration,
  maxDuration,
  recordingsCount,
  maxRecordings,
  onStartRecording,
  onStopRecording,
  disabled = false,
  compact = false,
}: StreamRecordButtonProps) {
  const canRecord = recordingsCount < maxRecordings && !disabled;
  const maxMinutes = Math.floor(maxDuration / 60);

  if (isRecording) {
    return (
      <button
        onClick={onStopRecording}
        className={`flex items-center backdrop-blur-xl bg-red-500/30 rounded-full border-2 border-red-500 text-white font-semibold hover:bg-red-500/40 active:scale-95 transition-all shadow-lg shadow-red-500/30 ${
          compact ? 'gap-1.5 px-3 py-2 min-h-[40px]' : 'gap-2 px-4 py-3 min-h-[48px]'
        }`}
        aria-label="Stop recording"
      >
        <div className="relative">
          <Circle className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-500 fill-red-500 animate-pulse`} />
        </div>
        <span className={`text-red-400 font-bold tabular-nums ${compact ? 'text-xs' : 'text-sm'}`}>{currentDuration}</span>
        <Square className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-white fill-white`} />
      </button>
    );
  }

  // Compact version - icon only with minimum touch target
  if (compact) {
    return (
      <button
        onClick={onStartRecording}
        disabled={!canRecord}
        className={`flex items-center justify-center min-w-[44px] min-h-[44px] p-2.5 backdrop-blur-xl rounded-full border transition-all active:scale-95 ${
          canRecord
            ? 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-red-500/50'
            : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
        }`}
        title={
          !canRecord
            ? `Maximum ${maxRecordings} recordings reached`
            : `Record up to ${maxMinutes} minutes (${recordingsCount}/${maxRecordings} used)`
        }
        aria-label={canRecord ? 'Start recording' : 'Recording limit reached'}
      >
        <Circle className={`w-5 h-5 ${canRecord ? 'text-red-500' : 'text-gray-600'}`} />
      </button>
    );
  }

  return (
    <button
      onClick={onStartRecording}
      disabled={!canRecord}
      className={`flex items-center gap-2 px-4 py-3 min-h-[48px] backdrop-blur-xl rounded-full border font-semibold transition-all active:scale-95 ${
        canRecord
          ? 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-red-500/50'
          : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
      }`}
      title={
        !canRecord
          ? `Maximum ${maxRecordings} recordings reached`
          : `Record up to ${maxMinutes} minutes (${recordingsCount}/${maxRecordings} used)`
      }
      aria-label={canRecord ? 'Start recording' : 'Recording limit reached'}
    >
      <Circle className={`w-5 h-5 ${canRecord ? 'text-red-500' : 'text-gray-600'}`} />
      <span className="text-sm font-medium">Record</span>
      {recordingsCount > 0 && (
        <span className="text-xs text-gray-400">({recordingsCount}/{maxRecordings})</span>
      )}
    </button>
  );
}
