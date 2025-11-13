'use client';

import { useEffect, useState } from 'react';
import { Trophy, Target, Gift, Users, Sparkles } from 'lucide-react';
import { GiftBurstEffect } from '@/components/animations/GiftBurstEffect';

interface StreamGoal {
  id: string;
  title: string;
  description?: string;
  goalType: 'gifts' | 'coins' | 'viewers';
  targetAmount: number;
  currentAmount: number;
  rewardText: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface StreamGoalsWidgetProps {
  goals: StreamGoal[];
  onGoalComplete?: (goal: StreamGoal) => void;
  compact?: boolean;
}

export function StreamGoalsWidget({ goals, onGoalComplete, compact = false }: StreamGoalsWidgetProps) {
  const [completedGoalId, setCompletedGoalId] = useState<string | null>(null);
  const activeGoals = goals.filter(g => g.isActive && !g.isCompleted);
  const nextGoal = activeGoals[0];

  useEffect(() => {
    // Check if any goal just completed
    const justCompleted = goals.find(
      g => g.isCompleted && g.currentAmount >= g.targetAmount && g.id !== completedGoalId
    );

    if (justCompleted) {
      setCompletedGoalId(justCompleted.id);
      onGoalComplete?.(justCompleted);

      // Reset after animation
      setTimeout(() => setCompletedGoalId(null), 3000);
    }
  }, [goals]);

  if (!nextGoal && activeGoals.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'gifts':
        return Gift;
      case 'coins':
        return Sparkles;
      case 'viewers':
        return Users;
      default:
        return Target;
    }
  };

  if (compact) {
    return (
      <CompactGoalBar
        goal={nextGoal}
        icon={getIcon(nextGoal.goalType)}
        showCompleted={completedGoalId === nextGoal?.id}
      />
    );
  }

  return (
    <div className="space-y-3">
      {completedGoalId && (
        <GiftBurstEffect
          giftName="🎉 GOAL COMPLETED!"
          giftIcon="star"
          rarity="legendary"
          triggerKey={completedGoalId}
        />
      )}

      {activeGoals.slice(0, 3).map((goal, index) => {
        const Icon = getIcon(goal.goalType);
        const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
        const isCompleting = completedGoalId === goal.id;

        return (
          <div
            key={goal.id}
            className={`
              relative overflow-hidden rounded-2xl transition-all duration-500
              ${index === 0 ? 'scale-100' : 'scale-95 opacity-80'}
            `}
          >
            {/* Glass background */}
            <div className="glass border-2 border-white/20 p-4 relative">
              {/* Animated background glow */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-digis-cyan/10 via-digis-pink/10 to-digis-purple/10 opacity-50 animate-pulse"
                style={{
                  animation: isCompleting ? 'pulse 0.5s ease-in-out infinite' : undefined,
                }}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20">
                      <Icon className="w-5 h-5 text-digis-cyan" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm md:text-base">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-xs text-gray-600">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-digis-cyan/20 to-digis-pink/20">
                    <span className="text-xs font-bold text-gray-700">
                      {goal.currentAmount}/{goal.targetAmount}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden mb-2">
                  {/* Background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300" />

                  {/* Progress fill with neon glow */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple transition-all duration-700 ease-out"
                    style={{
                      width: `${percentage}%`,
                      boxShadow: '0 0 20px rgba(0, 245, 255, 0.6), 0 0 40px rgba(255, 0, 255, 0.4)',
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>

                  {/* Percentage text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white drop-shadow-lg">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>

                {/* Reward text */}
                <div className="flex items-center gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-700 font-medium">{goal.rewardText}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Compact version for stream overlay
function CompactGoalBar({
  goal,
  icon: Icon,
  showCompleted,
}: {
  goal: StreamGoal;
  icon: any;
  showCompleted: boolean;
}) {
  const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

  return (
    <div className="relative">
      <div
        className={`
        glass border-2 border-white/30 rounded-full px-4 py-2 flex items-center gap-3
        transition-all duration-300
        ${showCompleted ? 'scale-110 border-amber-400' : ''}
      `}
        style={{
          boxShadow: showCompleted
            ? '0 0 30px rgba(251, 191, 36, 0.8)'
            : '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Icon */}
        <div className="p-1.5 rounded-full bg-gradient-to-br from-digis-cyan/30 to-digis-pink/30">
          <Icon className="w-4 h-4 text-white" />
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-2 bg-gray-200/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple transition-all duration-700"
            style={{
              width: `${percentage}%`,
              boxShadow: '0 0 10px currentColor',
            }}
          />
        </div>

        {/* Count */}
        <span className="text-xs font-bold text-white drop-shadow-md whitespace-nowrap">
          {goal.currentAmount}/{goal.targetAmount}
        </span>
      </div>
    </div>
  );
}

// Stream overlay version (minimal, top of screen)
export function StreamGoalsOverlay({ goals }: { goals: StreamGoal[] }) {
  const activeGoals = goals.filter(g => g.isActive && !g.isCompleted);

  if (activeGoals.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
      <StreamGoalsWidget goals={goals} compact />
    </div>
  );
}
