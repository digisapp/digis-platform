'use client';

import { Trophy, Target, Users, Coins, Star } from 'lucide-react';

interface ProfileGoal {
  id: string;
  title: string;
  description?: string | null;
  goalType: 'followers' | 'coins' | 'subscribers';
  targetAmount: number;
  currentAmount: number;
  rewardText: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface ProfileGoalsWidgetProps {
  goals: ProfileGoal[];
  maxDisplay?: number;
}

export function ProfileGoalsWidget({ goals, maxDisplay = 3 }: ProfileGoalsWidgetProps) {
  const activeGoals = goals.filter(g => g.isActive && !g.isCompleted);

  if (activeGoals.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'followers':
        return Users;
      case 'coins':
        return Coins;
      case 'subscribers':
        return Star;
      default:
        return Target;
    }
  };

  const displayGoals = activeGoals.slice(0, maxDisplay);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-gray-900">Profile Goals</h3>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {displayGoals.map((goal) => {
          const Icon = getIcon(goal.goalType);
          const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

          return (
            <div
              key={goal.id}
              className="relative overflow-hidden rounded-xl border-2 border-purple-200 bg-white/60 backdrop-blur-sm p-4 hover:border-digis-cyan transition-all"
            >
              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20">
                      <Icon className="w-4 h-4 text-digis-cyan" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 text-sm">
                        {goal.title}
                      </h4>
                      {goal.description && (
                        <p className="text-xs text-gray-600">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-digis-cyan/20 to-digis-pink/20">
                    <span className="text-xs font-bold text-gray-700">
                      {goal.currentAmount.toLocaleString()}/{goal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden mb-2">
                  {/* Progress fill with gradient */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple transition-all duration-700 ease-out"
                    style={{
                      width: `${percentage}%`,
                      boxShadow: '0 0 10px rgba(0, 245, 255, 0.5)',
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>

                  {/* Percentage text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-900">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>

                {/* Reward text */}
                <div className="flex items-center gap-2 text-xs">
                  <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{goal.rewardText}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
