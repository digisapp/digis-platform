'use client';

import { useState } from 'react';
import { Edit2, XCircle } from 'lucide-react';
import type { StreamGoal, VirtualGift } from '@/db/schema';
import { useToastContext } from '@/context/ToastContext';

interface GoalWithGift extends StreamGoal {
  gift?: VirtualGift | null;
}

interface GoalProgressBarProps {
  goals: GoalWithGift[];
  isBroadcaster?: boolean;
  streamId?: string;
  onEdit?: (goal: GoalWithGift) => void;
  onGoalEnded?: () => void;
}

export function GoalProgressBar({ goals, isBroadcaster = false, streamId, onEdit, onGoalEnded }: GoalProgressBarProps) {
  const { showError } = useToastContext();
  const [endingGoalId, setEndingGoalId] = useState<string | null>(null);
  const activeGoals = goals.filter(g => g.isActive && !g.isCompleted);

  const handleEndGoal = async (goalId: string) => {
    if (!streamId) return;
    if (!confirm('Are you sure you want to end this goal? This cannot be undone.')) return;

    setEndingGoalId(goalId);
    try {
      const response = await fetch(`/api/streams/${streamId}/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to end goal');
      }

      // Notify parent to refresh goals
      onGoalEnded?.();
    } catch (error: any) {
      showError(error.message || 'Failed to end goal');
    } finally {
      setEndingGoalId(null);
    }
  };

  if (activeGoals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {activeGoals.map((goal) => {
        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
        const isComplete = progress >= 100;

        return (
          <div
            key={goal.id}
            className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-semibold">{goal.title}</h4>
                  {goal.gift && <span className="text-2xl">{goal.gift.emoji}</span>}
                </div>
                {goal.description && (
                  <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-digis-cyan font-bold">
                    {goal.currentAmount} / {goal.targetAmount}
                  </span>
                </div>
                {isBroadcaster && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit?.(goal)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Edit goal"
                    >
                      <Edit2 className="w-4 h-4 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleEndGoal(goal.id)}
                      disabled={endingGoalId === goal.id}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                      title="End goal"
                    >
                      <XCircle className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  isComplete
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                    : 'bg-gradient-to-r from-digis-cyan to-digis-pink'
                }`}
                style={{ width: `${progress}%` }}
              />
              {isComplete && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white animate-pulse">
                    UNLOCKED!
                  </span>
                </div>
              )}
            </div>

            {/* Reward */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-400">Reward:</span>
              <span className="text-sm text-yellow-400 font-semibold">{goal.rewardText}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
