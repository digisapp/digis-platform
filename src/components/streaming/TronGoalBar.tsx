'use client';

import { Target, Pencil, Gift } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  rewardText?: string | null;
  targetAmount: number;
  currentAmount: number;
}

interface TronGoalBarProps {
  goals: Goal[];
  className?: string;
  onEdit?: (goalId: string) => void; // Optional edit callback for host
  vertical?: boolean; // If true, renders as vertical bar on the side
}

export function TronGoalBar({ goals, className = '', onEdit, vertical = false }: TronGoalBarProps) {
  if (!goals || goals.length === 0) return null;

  // Vertical layout - shows progress bar going up/down
  if (vertical) {
    return (
      <div className={`${onEdit ? 'pointer-events-auto' : 'pointer-events-none'} ${className}`}>
        <div className="flex flex-col gap-2">
          {goals.map((goal) => {
            const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const isComplete = percentage >= 100;

            return (
              <div
                key={goal.id}
                className="relative bg-black/70 backdrop-blur-xl rounded-xl p-2 border border-cyan-500/40 shadow-[0_0_25px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden w-14"
              >
                {/* Animated scan line effect - vertical */}
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-scan-vertical"
                    style={{ animationDuration: '3s' }}
                  />
                </div>

                {/* Corner accents - Tron style */}
                <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-400 rounded-br-lg" />

                {/* Content - vertical layout */}
                <div className="relative z-10 flex flex-col items-center">
                  {/* Target icon */}
                  <div className={`p-1 rounded ${isComplete ? 'bg-green-500/20' : 'bg-cyan-500/20'} mb-1`}>
                    <Target className={`w-4 h-4 ${isComplete ? 'text-green-400' : 'text-cyan-400'} drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`} />
                  </div>

                  {/* Goal title - vertical text */}
                  <div className="w-10 mb-1">
                    <p className="text-[8px] font-bold text-white text-center leading-tight line-clamp-2 drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]">
                      {goal.title}
                    </p>
                  </div>

                  {/* Vertical progress bar container */}
                  <div className="w-3 h-20 bg-gray-800/80 rounded-full overflow-hidden border border-cyan-500/30 shadow-inner relative">
                    {/* Progress fill - from bottom up */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out ${
                        isComplete
                          ? 'bg-gradient-to-t from-green-500 via-emerald-400 to-green-500'
                          : 'bg-gradient-to-t from-cyan-500 via-cyan-400 to-purple-500'
                      }`}
                      style={{ height: `${percentage}%` }}
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/30 to-white/0 animate-pulse" />
                    </div>
                  </div>

                  {/* Amount text */}
                  <div className="mt-1.5 text-center">
                    <div className={`text-[10px] font-bold ${isComplete ? 'text-green-400' : 'text-cyan-300'} drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`}>
                      {goal.currentAmount}
                    </div>
                    <div className="text-[8px] text-gray-400">
                      /{goal.targetAmount}
                    </div>
                  </div>

                  {/* Percentage */}
                  <div className={`text-[9px] font-bold mt-0.5 ${isComplete ? 'text-green-400' : 'text-cyan-400'} drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`}>
                    {Math.round(percentage)}%
                  </div>

                  {/* Edit button */}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(goal.id)}
                      className="mt-1 p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 transition-colors border border-cyan-500/30"
                    >
                      <Pencil className="w-2.5 h-2.5 text-cyan-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CSS animations */}
        <style jsx>{`
          @keyframes scan-vertical {
            0% {
              transform: translateY(-100%);
            }
            100% {
              transform: translateY(100%);
            }
          }
          .animate-scan-vertical {
            animation: scan-vertical 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // Horizontal layout (original)
  return (
    <div className={`${onEdit ? 'pointer-events-auto' : 'pointer-events-none'} ${className}`}>
      {goals.map((goal) => {
        const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
        const isComplete = percentage >= 100;

        return (
          <div
            key={goal.id}
            className="relative bg-black/70 backdrop-blur-xl rounded-xl p-2.5 border border-cyan-500/40 shadow-[0_0_25px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden"
          >
            {/* Animated scan line effect */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-scan"
                style={{ animationDuration: '3s' }}
              />
            </div>

            {/* Corner accents - Tron style */}
            <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-cyan-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-cyan-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-cyan-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-cyan-400 rounded-br-lg" />

            {/* Content */}
            <div className="relative z-10">
              {/* Header - Title and Progress */}
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`p-0.5 rounded ${isComplete ? 'bg-green-500/20' : 'bg-cyan-500/20'}`}>
                  <Target className={`w-3.5 h-3.5 ${isComplete ? 'text-green-400' : 'text-cyan-400'} drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`} />
                </div>
                <span className="text-[11px] font-bold text-white truncate flex-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {goal.title}
                </span>
                <span className={`text-[11px] font-bold ${isComplete ? 'text-green-400' : 'text-cyan-300'} drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`}>
                  {goal.currentAmount}/{goal.targetAmount}
                </span>
                {/* Edit button - only shown for host */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(goal.id)}
                    className="p-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 transition-colors border border-cyan-500/30"
                  >
                    <Pencil className="w-3 h-3 text-cyan-400" />
                  </button>
                )}
              </div>

              {/* Reward text */}
              {goal.rewardText && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Gift className="w-3 h-3 text-pink-400" />
                  <span className="text-[10px] text-pink-300 truncate">
                    {goal.rewardText}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-800/80 rounded-full overflow-hidden border border-cyan-500/30 shadow-inner">
                <div
                  className={`h-full transition-all duration-700 ease-out relative ${
                    isComplete
                      ? 'bg-gradient-to-r from-green-500 via-emerald-400 to-green-500'
                      : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-pulse" />
                  {/* Progress shine */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{
                      animation: 'shine 2s ease-in-out infinite',
                      transform: 'skewX(-20deg)',
                    }}
                  />
                </div>
              </div>

              {/* Percentage text */}
              {percentage > 0 && (
                <div className="flex justify-end mt-0.5">
                  <span className={`text-[9px] font-bold ${isComplete ? 'text-green-400' : 'text-cyan-400'} drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]`}>
                    {Math.round(percentage)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-20deg);
          }
          100% {
            transform: translateX(200%) skewX(-20deg);
          }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
