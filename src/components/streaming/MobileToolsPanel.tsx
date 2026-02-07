'use client';

import { Target, BarChart2, Clock, Ticket, X, Plus } from 'lucide-react';

interface MobileToolsPanelProps {
  showMobileTools: boolean;
  onToggle: (show: boolean) => void;
  goals: Array<{ isActive: boolean; isCompleted: boolean }>;
  activePoll: { isActive: boolean } | null;
  activeCountdown: { isActive: boolean } | null;
  announcedTicketedStream: unknown | null;
  onGoalClick: () => void;
  onPollClick: () => void;
  onCountdownClick: () => void;
  onVipClick: () => void;
}

export function MobileToolsPanel({
  showMobileTools,
  onToggle,
  goals,
  activePoll,
  activeCountdown,
  announcedTicketedStream,
  onGoalClick,
  onPollClick,
  onCountdownClick,
  onVipClick,
}: MobileToolsPanelProps) {
  const hasActiveGoal = goals.some(g => g.isActive && !g.isCompleted);

  if (showMobileTools) {
    return (
      <div className="flex flex-col gap-3 p-4 backdrop-blur-xl bg-black/90 rounded-2xl border border-white/20 shadow-xl">
        {/* Close button */}
        <button
          onClick={() => onToggle(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
        >
          <X className="w-6 h-6 text-white" />
          <span className="text-white text-base font-medium">Close</span>
        </button>

        {/* Goal Button */}
        <button
          onClick={() => {
            if (hasActiveGoal) return;
            onGoalClick();
            onToggle(false);
          }}
          disabled={hasActiveGoal}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            hasActiveGoal
              ? 'bg-gray-600/30 opacity-50'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30'
          }`}
        >
          <Target className={`w-6 h-6 ${hasActiveGoal ? 'text-gray-500' : 'text-cyan-400'}`} />
          <span className={`text-base font-medium ${hasActiveGoal ? 'text-gray-500' : 'text-cyan-400'}`}>Goal</span>
        </button>

        {/* Poll Button */}
        <button
          onClick={() => {
            onPollClick();
            onToggle(false);
          }}
          disabled={!!activePoll?.isActive}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            activePoll?.isActive
              ? 'bg-purple-500/30'
              : 'bg-purple-500/20 hover:bg-purple-500/30'
          }`}
        >
          <BarChart2 className="w-6 h-6 text-purple-400" />
          <span className="text-base font-medium text-purple-400">Poll</span>
        </button>

        {/* Timer Button */}
        <button
          onClick={() => {
            onCountdownClick();
            onToggle(false);
          }}
          disabled={!!activeCountdown?.isActive}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            activeCountdown?.isActive
              ? 'bg-cyan-500/30'
              : 'bg-cyan-500/20 hover:bg-cyan-500/30'
          }`}
        >
          <Clock className="w-6 h-6 text-cyan-400" />
          <span className="text-base font-medium text-cyan-400">Timer</span>
        </button>

        {/* VIP Button */}
        {!announcedTicketedStream && (
          <button
            onClick={() => {
              onVipClick();
              onToggle(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-all"
          >
            <Ticket className="w-6 h-6 text-amber-400" />
            <span className="text-base font-medium text-amber-400">VIP</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggle(true)}
      className="flex items-center gap-2 px-4 py-3 backdrop-blur-xl bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full border-2 border-cyan-400/50 hover:border-cyan-400 active:scale-95 transition-all shadow-xl shadow-cyan-500/20"
      title="Stream Tools"
      aria-label="Open stream tools menu"
    >
      <Plus className="w-6 h-6 text-white" />
      <span className="text-white font-semibold text-sm">Tools</span>
    </button>
  );
}
