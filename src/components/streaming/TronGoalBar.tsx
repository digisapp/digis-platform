'use client';

import { Target, Pencil } from 'lucide-react';

interface Goal {
  id: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
}

interface TronGoalBarProps {
  goals: Goal[];
  className?: string;
  onEdit?: (goalId: string) => void; // Optional edit callback for host
}

export function TronGoalBar({ goals, className = '', onEdit }: TronGoalBarProps) {
  if (!goals || goals.length === 0) return null;

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
              {/* Header */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`p-0.5 rounded ${isComplete ? 'bg-green-500/20' : 'bg-cyan-500/20'}`}>
                  <Target className={`w-3.5 h-3.5 ${isComplete ? 'text-green-400' : 'text-cyan-400'} drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]`} />
                </div>
                <span className="text-[11px] font-bold text-white truncate flex-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {goal.description}
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
