'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Target, Users, Coins, Star, Edit2, Trash2, Check, X } from 'lucide-react';

interface CreatorGoal {
  id: string;
  title: string;
  description: string | null;
  goalType: 'followers' | 'coins' | 'subscribers';
  targetAmount: number;
  currentAmount: number;
  rewardText: string;
  isActive: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

export default function CreatorGoalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<CreatorGoal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<CreatorGoal | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/creator/goals');
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals);
      } else if (response.status === 403) {
        router.push('/creator/apply');
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const response = await fetch(`/api/creator/goals/${goalId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGoals(goals.filter(g => g.id !== goalId));
      } else {
        alert('Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal');
    }
  };

  const handleToggleActive = async (goal: CreatorGoal) => {
    try {
      const response = await fetch(`/api/creator/goals/${goal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !goal.isActive }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals(goals.map(g => g.id === goal.id ? data.goal : g));
      } else {
        alert('Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal');
    }
  };

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

  const getIconColor = (type: string) => {
    switch (type) {
      case 'followers':
        return 'text-digis-cyan';
      case 'coins':
        return 'text-yellow-500';
      case 'subscribers':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient md:pl-20 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pastel-gradient md:pl-20 pb-24 md:pb-8">
      <div className="container mx-auto px-4 pt-6 md:pt-10 max-w-5xl">
        {/* Create Goal Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto mb-6 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Goal
        </button>

        {/* Goals List */}
        {goals.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first profile goal to engage your followers!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              Create Goal
            </button>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const Icon = getIcon(goal.goalType);
              const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

              return (
                <GlassCard key={goal.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200`}>
                        <Icon className={`w-6 h-6 ${getIconColor(goal.goalType)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
                          {goal.isCompleted && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                              COMPLETED
                            </span>
                          )}
                          {!goal.isActive && (
                            <span className="px-2 py-0.5 bg-gray-400 text-white text-xs font-bold rounded-full">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                        )}
                        <p className="text-sm text-gray-700 font-medium mb-3">
                          🎁 Reward: {goal.rewardText}
                        </p>

                        {/* Progress Bar */}
                        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-digis-cyan via-digis-pink to-digis-purple transition-all duration-700"
                            style={{ width: `${percentage}%` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-900">
                              {goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()} ({Math.round(percentage)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(goal)}
                        className={`p-2 rounded-lg transition-colors ${
                          goal.isActive
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                        }`}
                        title={goal.isActive ? 'Active' : 'Inactive'}
                      >
                        {goal.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setEditingGoal(goal)}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingGoal) && (
          <GoalModal
            goal={editingGoal}
            onClose={() => {
              setShowCreateModal(false);
              setEditingGoal(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingGoal(null);
              fetchGoals();
            }}
          />
        )}

        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}

// Goal Creation/Edit Modal Component
function GoalModal({
  goal,
  onClose,
  onSuccess,
}: {
  goal: CreatorGoal | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: goal?.title || '',
    description: goal?.description || '',
    goalType: goal?.goalType || 'coins',
    targetAmount: goal?.targetAmount || 1000,
    rewardText: goal?.rewardText || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = goal ? `/api/creator/goals/${goal.id}` : '/api/creator/goals';
      const method = goal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save goal');
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <GlassCard className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {goal ? 'Edit Goal' : 'Create Goal'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Reach 1,000 Followers!"
              className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 focus:outline-none focus:border-digis-cyan"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a short description..."
              className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 focus:outline-none focus:border-digis-cyan"
            />
          </div>

          {/* Goal (Coins) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Goal (Coins) *</label>
            <input
              type="number"
              min="1"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 10000"
              className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 focus:outline-none focus:border-digis-cyan"
              required
            />
          </div>

          {/* Reward Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reward Text *</label>
            <input
              type="text"
              value={formData.rewardText}
              onChange={(e) => setFormData({ ...formData, rewardText: e.target.value })}
              placeholder="e.g., I'll post exclusive content!"
              className="w-full px-4 py-3 bg-white/60 border border-purple-200 rounded-xl text-gray-800 focus:outline-none focus:border-digis-cyan"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/80 border-2 border-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : goal ? 'Save Changes' : 'Create Goal'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
