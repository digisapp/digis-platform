'use client';

import { useState } from 'react';
import { Trophy, Target, Users, Coins, Star, Zap, Sparkles as SparklesIcon } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';

interface Tipper {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  totalAmount: number;
}

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
  metadata?: string | null;
  showTopTippers?: boolean;
}

interface ProfileGoalsWidgetProps {
  goals: ProfileGoal[];
  maxDisplay?: number;
  onGoalUpdate?: () => void;
}

export function ProfileGoalsWidget({ goals, maxDisplay = 3, onGoalUpdate }: ProfileGoalsWidgetProps) {
  const { toast, showToast, hideToast } = useToast();
  const [tippingGoalId, setTippingGoalId] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleTipClick = (goalId: string) => {
    setSelectedGoalId(goalId);
    setShowTipModal(true);
    setTipAmount('');
    setTipMessage('');
  };

  const handleSendTip = async () => {
    if (!selectedGoalId || !tipAmount || parseFloat(tipAmount) <= 0) {
      showToast('Please enter a valid gift amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/creator/goals/${selectedGoalId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(tipAmount),
          message: tipMessage || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      // Show success message
      if (data.goalCompleted) {
        showToast(`🎉 Amazing! Your ${data.amount} coin gift completed the goal!`, 'success');
      } else {
        showToast(`✨ Successfully sent ${data.amount} coins toward the goal!`, 'success');
      }

      // Close modal and refresh
      setShowTipModal(false);
      setTipAmount('');
      setTipMessage('');
      setSelectedGoalId(null);

      // Trigger refresh if callback provided
      if (onGoalUpdate) {
        onGoalUpdate();
      } else {
        // Fallback: reload the page
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Gift error:', error);
      showToast(error.message || 'Failed to send gift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const displayGoals = activeGoals.slice(0, maxDisplay);

  return (
    <>
    {/* Toast Notification */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    )}

    <div className="space-y-3">
        {displayGoals.map((goal) => {
          const Icon = getIcon(goal.goalType);
          const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

          return (
            <div
              key={goal.id}
              className="relative overflow-hidden rounded-2xl border-2 border-purple-300/50 bg-gradient-to-br from-white/80 via-white/70 to-purple-50/50 backdrop-blur-md p-5 hover:border-digis-cyan transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 group"
            >
              {/* Animated background particles */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-digis-cyan/30 to-transparent rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-digis-pink/30 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>

              {/* Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-digis-cyan via-digis-pink to-digis-purple shadow-lg">
                      <Icon className="w-5 h-5 text-white" />
                      <div className="absolute -inset-1 bg-gradient-to-br from-digis-cyan to-digis-pink rounded-xl blur opacity-50 -z-10 group-hover:opacity-75 transition-opacity" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-base mb-0.5 flex items-center gap-2">
                        {goal.title}
                        <SparklesIcon className="w-4 h-4 text-amber-500 animate-pulse" />
                      </h4>
                      {goal.description && (
                        <p className="text-xs text-gray-600">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-digis-cyan/30 via-digis-pink/30 to-digis-purple/30 border border-digis-cyan/50 shadow-lg">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {goal.currentAmount.toLocaleString()}/{goal.targetAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Futuristic Progress bar */}
                <div className="relative h-8 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 rounded-full overflow-hidden mb-3 shadow-inner border-2 border-gray-700/50">
                  {/* Animated background grid */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.3) 1px, transparent 1px), linear-gradient(rgba(0,245,255,0.3) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }} />

                  {/* Progress fill with neon gradient */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transition-all duration-700 ease-out relative overflow-hidden"
                    style={{
                      width: `${percentage}%`,
                      boxShadow: '0 0 20px rgba(0, 245, 255, 0.8), inset 0 0 20px rgba(255,255,255,0.3)',
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />

                    {/* Particle trail effect */}
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                  </div>

                  {/* Glow overlay on progress end */}
                  <div
                    className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent to-cyan-400/50 blur-xl pointer-events-none transition-all duration-700"
                    style={{ left: `${Math.max(0, percentage - 10)}%` }}
                  />

                  {/* Percentage text with glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white drop-shadow-[0_0_8px_rgba(0,245,255,1)]">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                </div>

                {/* Reward and Tip Button */}
                <div className="flex items-center justify-between gap-3">
                  {/* Reward text */}
                  <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                    <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium truncate">{goal.rewardText}</span>
                  </div>

                  {/* Gift Button */}
                  <button
                    onClick={() => handleTipClick(goal.id)}
                    className="relative px-4 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple text-white shadow-lg hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 active:scale-95 group/btn flex items-center gap-2 flex-shrink-0"
                  >
                    <Zap className="w-4 h-4 group-hover/btn:animate-bounce" />
                    <span>Gift</span>

                    {/* Glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple rounded-xl blur opacity-50 group-hover/btn:opacity-100 transition-opacity -z-10" />
                  </button>
                </div>

                {/* Top Tippers */}
                {goal.showTopTippers !== false && (() => {
                  let tippers: Tipper[] = [];
                  if (goal.metadata) {
                    try {
                      const metadata = JSON.parse(goal.metadata);
                      tippers = (metadata.tippers || []).slice(0, 3);
                    } catch (e) {
                      console.error('Failed to parse goal metadata:', e);
                    }
                  }

                  if (tippers.length === 0) return null;

                  return (
                    <div className="mt-3 pt-3 border-t border-gray-300/50">
                      <div className="flex items-center gap-2 mb-2">
                        <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-gray-700">Top Supporters</span>
                      </div>
                      <div className="space-y-1.5">
                        {tippers.map((tipper, index) => (
                          <div
                            key={tipper.userId}
                            className="flex items-center gap-2 text-xs"
                          >
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {/* Rank badge */}
                              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                                index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' :
                                'bg-gradient-to-br from-amber-700 to-amber-800 text-white'
                              }`}>
                                {index + 1}
                              </div>

                              {/* Avatar */}
                              {tipper.avatarUrl ? (
                                <img
                                  src={tipper.avatarUrl}
                                  alt={tipper.displayName || tipper.username}
                                  className="w-5 h-5 rounded-full flex-shrink-0 border border-purple-200"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex-shrink-0 border border-purple-200" />
                              )}

                              {/* Name */}
                              <span className="font-medium text-gray-800 truncate">
                                {tipper.displayName || tipper.username}
                              </span>
                            </div>

                            {/* Amount */}
                            <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-300/50 flex-shrink-0">
                              <Coins className="w-3 h-3 text-amber-600" />
                              <span className="font-bold text-amber-700">{tipper.totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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

    {/* Gift Modal */}
    {showTipModal && selectedGoalId && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="relative max-w-md w-full bg-gradient-to-br from-white via-purple-50/50 to-cyan-50/50 rounded-2xl shadow-2xl border-2 border-purple-300/50 p-6">
          {/* Close button */}
          <button
            onClick={() => setShowTipModal(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          >
            ✕
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-digis-cyan to-digis-pink">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple bg-clip-text text-transparent">
                Gift Toward Goal
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Your gift will help the creator reach their goal!
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Gift Amount */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Gift Amount (Coins) *
              </label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                <input
                  type="number"
                  min="1"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="w-full pl-11 pr-4 py-3 bg-white/80 border-2 border-purple-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                  required
                />
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTipAmount(amount.toString())}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 hover:from-purple-500/20 hover:to-cyan-500/20 border border-purple-300/50 transition-colors"
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Message */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={tipMessage}
                onChange={(e) => setTipMessage(e.target.value)}
                placeholder="Add a supportive message..."
                rows={3}
                className="w-full px-4 py-3 bg-white/80 border-2 border-purple-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTipModal(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTip}
                disabled={submitting || !tipAmount || parseFloat(tipAmount) <= 0}
                className="relative flex-1 px-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? 'Sending...' : 'Send Gift'}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple rounded-xl blur opacity-50 -z-10" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
