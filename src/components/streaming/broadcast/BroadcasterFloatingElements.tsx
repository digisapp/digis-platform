'use client';

import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { AlertManager, type Alert } from '@/components/streaming/AlertManager';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { PrivateTipsButton, PrivateTipsPanel, type PrivateTip } from '@/components/streaming/broadcast';
import type { StreamGoal } from '@/db/schema';

interface FloatingGift {
  id: string;
  emoji: string;
  rarity: string;
  timestamp: number;
  giftName?: string;
}

interface CelebratingGoal {
  id: string;
  title: string;
  rewardText: string;
}

interface BroadcasterFloatingElementsProps {
  // Floating gifts
  floatingGifts: FloatingGift[];
  removeFloatingGift: (id: string) => void;
  // Goal celebration
  celebratingGoal: CelebratingGoal | null;
  completedGoalsQueue: CelebratingGoal[];
  // Alerts
  alerts: Alert[];
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
  // Private tips
  showPrivateTips: boolean;
  setShowPrivateTips: React.Dispatch<React.SetStateAction<boolean>>;
  privateTips: PrivateTip[];
  hasNewPrivateTips: boolean;
  setHasNewPrivateTips: (v: boolean) => void;
  // Mobile floating goal bar
  streamId: string;
  goals: StreamGoal[];
  setGoals: React.Dispatch<React.SetStateAction<StreamGoal[]>>;
  setEditingGoal: React.Dispatch<React.SetStateAction<StreamGoal | null>>;
  setShowGoalModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export function BroadcasterFloatingElements({
  floatingGifts,
  removeFloatingGift,
  celebratingGoal,
  completedGoalsQueue,
  alerts,
  setAlerts,
  showPrivateTips,
  setShowPrivateTips,
  privateTips,
  hasNewPrivateTips,
  setHasNewPrivateTips,
  streamId,
  goals,
  setGoals,
  setEditingGoal,
  setShowGoalModal,
}: BroadcasterFloatingElementsProps) {
  return (
    <>
      {/* Floating Gift Emojis Overlay */}
      <GiftFloatingEmojis gifts={floatingGifts} onComplete={removeFloatingGift} />

      {/* Goal Completed Celebration */}
      {celebratingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{celebratingGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{celebratingGoal.rewardText}</span>
            </div>
            {completedGoalsQueue.length > 0 && (
              <div className="mt-3 text-sm text-gray-400">
                +{completedGoalsQueue.length} more goal{completedGoalsQueue.length > 1 ? 's' : ''} unlocked!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alert Manager */}
      <AlertManager
        alerts={alerts}
        onAlertComplete={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
      />

      {/* Private Tips Button - Floating */}
      <PrivateTipsButton
        onClick={() => {
          setShowPrivateTips(!showPrivateTips);
          setHasNewPrivateTips(false);
        }}
        tipCount={privateTips.length}
        hasNewTips={hasNewPrivateTips}
      />

      {/* Private Tips Panel - Slide-in from right */}
      <PrivateTipsPanel
        isOpen={showPrivateTips}
        onClose={() => setShowPrivateTips(false)}
        tips={privateTips}
      />

      {/* Floating Tron Goal Bar - mobile only */}
      {goals.length > 0 && goals.some(g => g.isActive && !g.isCompleted) && (
        <div className="lg:hidden fixed top-28 left-3 z-40 w-[50%] max-w-[200px]">
          <TronGoalBar
            goals={goals.filter(g => g.isActive && !g.isCompleted).map(g => ({
              id: g.id,
              title: g.title || 'Stream Goal',
              description: g.description,
              rewardText: g.rewardText,
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
            }))}
            onEdit={(goalId) => {
              const goalToEdit = goals.find(g => g.id === goalId);
              if (goalToEdit) {
                setEditingGoal(goalToEdit);
                setShowGoalModal(true);
              }
            }}
            onCancel={async (goalId) => {
              try {
                await fetch(`/api/streams/${streamId}/goals`, {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ goalId }),
                });
                setGoals(prev => prev.filter(g => g.id !== goalId));
              } catch (err) {
                console.error('Failed to cancel goal:', err);
              }
            }}
          />
        </div>
      )}

      {/* CSS for animated gradient border */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </>
  );
}
