'use client';

import { useState } from 'react';
import { GlassModal, GlassInput, GlassButton } from '@/components/ui';

interface SetGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  onGoalCreated: () => void;
}

export function SetGoalModal({ isOpen, onClose, streamId, onGoalCreated }: SetGoalModalProps) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [rewardText, setRewardText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          goalType: 'coins', // For now, just coin goals
          targetAmount: parseInt(targetAmount),
          rewardText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create goal');
      }

      // Success!
      setTitle('');
      setTargetAmount('');
      setRewardText('');
      onGoalCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Set Stream Goal" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <GlassInput
          label="Goal Title"
          placeholder="e.g., Next Song Request"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <GlassInput
          label="Target Amount (coins)"
          type="number"
          placeholder="e.g., 100"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
          min="1"
        />

        <GlassInput
          label="Reward"
          placeholder="e.g., I'll sing your requested song!"
          value={rewardText}
          onChange={(e) => setRewardText(e.target.value)}
          required
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <GlassButton
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="gradient"
            size="lg"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
}
