'use client';

import { Target, Users as UsersIcon, TrendingUp } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  current: number;
  target: number;
  contributors: number;
  type: 'coins' | 'followers' | 'subscribers';
}

interface GoalsWidgetProps {
  goals: Goal[];
}

export function GoalsWidget({ goals }: GoalsWidgetProps) {
  if (!goals || goals.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'followers':
        return <UsersIcon className="w-5 h-5" />;
      case 'subscribers':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'followers':
        return 'from-pink-500 to-purple-500';
      case 'subscribers':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-yellow-400 to-orange-500';
    }
  };

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const progress = Math.min((goal.current / goal.target) * 100, 100);
        const isCompleted = progress >= 100;

        return (
          <div
            key={goal.id}
            className="relative overflow-hidden rounded-2xl bg-white/60 backdrop-blur-sm border-2 border-purple-200 p-5 hover:border-digis-cyan transition-all hover:shadow-xl group"
          >
            {/* Background glow */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getColor(goal.type)} transition-all`} />

            {/* Icon */}
            <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${getColor(goal.type)} text-white mb-3`}>
              {getIcon(goal.type)}
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-bold text-gray-900 mb-1">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
            )}

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-gray-900">
                  {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                  {goal.type === 'coins' && ' coins'}
                </span>
                <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-digis-cyan'}`}>
                  {progress.toFixed(0)}%
                </span>
              </div>

              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getColor(goal.type)} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Contributors */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <UsersIcon className="w-4 h-4" />
              <span>
                <strong>{goal.contributors}</strong> contributor{goal.contributors !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Completed badge */}
            {isCompleted && (
              <div className="absolute top-5 right-5">
                <div className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold flex items-center gap-1">
                  ✓ Completed
                </div>
              </div>
            )}
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
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
