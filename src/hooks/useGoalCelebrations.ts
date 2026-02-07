'use client';

import { useEffect, useState } from 'react';

interface CompletedGoal {
  id: string;
  title: string;
  rewardText: string;
}

/**
 * Manages a queue of completed stream goals, showing celebrations one at a time.
 * Each celebration auto-dismisses after 5 seconds.
 */
export function useGoalCelebrations() {
  const [completedGoalsQueue, setCompletedGoalsQueue] = useState<CompletedGoal[]>([]);
  const [celebratingGoal, setCelebratingGoal] = useState<CompletedGoal | null>(null);

  useEffect(() => {
    if (!celebratingGoal && completedGoalsQueue.length > 0) {
      const nextGoal = completedGoalsQueue[0];
      setCelebratingGoal(nextGoal);
      setCompletedGoalsQueue(prev => prev.slice(1));
      const timer = setTimeout(() => {
        setCelebratingGoal(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [celebratingGoal, completedGoalsQueue]);

  const addCompletedGoal = (goal: CompletedGoal) => {
    setCompletedGoalsQueue(prev => [...prev, goal]);
  };

  return {
    celebratingGoal,
    completedGoalsQueue,
    addCompletedGoal,
  };
}
