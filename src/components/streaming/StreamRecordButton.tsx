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
}: StreamRecordButtonProps) {
  const canRecord = recordingsCount < maxRecordings && !disabled;
  const maxMinutes = Math.floor(maxDuration / 60);

  if (isRecording) {
    return (
      <button
        onClick={onStopRecording}
        className="flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl bg-red-500/30 rounded-full border border-red-500 text-white font-semibold hover:bg-red-500/40 transition-all animate-pulse"
      >
        <div className="relative">
          <Circle className="w-4 h-4 text-red-500 fill-red-500" />
          <div className="absolute inset-0 animate-ping">
            <Circle className="w-4 h-4 text-red-500 fill-red-500 opacity-50" />
          </div>
        </div>
        <span className="text-red-400 text-sm font-bold tabular-nums">{currentDuration}</span>
        <Square className="w-3 h-3 text-white fill-white" />
      </button>
    );
  }

  return (
    <button
      onClick={onStartRecording}
      disabled={!canRecord}
      className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl rounded-full border font-semibold transition-all ${
        canRecord
          ? 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-red-500/50'
          : 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
      }`}
      title={
        !canRecord
          ? `Maximum ${maxRecordings} recordings reached`
          : `Record up to ${maxMinutes} minutes (${recordingsCount}/${maxRecordings} used)`
      }
    >
      <Circle className={`w-4 h-4 ${canRecord ? 'text-red-500' : 'text-gray-600'}`} />
      <span className="text-sm">Record</span>
      {recordingsCount > 0 && (
        <span className="text-xs text-gray-400">({recordingsCount}/{maxRecordings})</span>
      )}
    </button>
  );
}
