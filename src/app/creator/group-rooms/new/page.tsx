'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { MobileHeader } from '@/components/layout/MobileHeader';

const ROOM_TYPES = [
  { value: 'coaching', label: 'Coaching', icon: '🎯' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'workshop', label: 'Workshop', icon: '🛠' },
  { value: 'hangout', label: 'Hangout', icon: '🎉' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'other', label: 'Other', icon: '✨' },
];

export default function NewGroupRoomPage() {
  const router = useRouter();
  const { showError, showSuccess } = useToastContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState('coaching');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [priceType, setPriceType] = useState<'free' | 'flat' | 'per_minute'>('free');
  const [priceCoins, setPriceCoins] = useState(50);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledStart, setScheduledStart] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Title is required');
      return;
    }

    if (priceType !== 'free' && priceCoins < 1) {
      showError('Set a price for paid rooms');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/group-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          roomType,
          maxParticipants,
          priceType,
          priceCoins: priceType === 'free' ? 0 : priceCoins,
          scheduledStart: isScheduled && scheduledStart ? scheduledStart : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess('Room created!');
        if (!isScheduled) {
          // Instant room - go directly to it
          router.push(`/group-rooms/${data.room.id}`);
        } else {
          router.push('/creator/group-rooms');
        }
      } else {
        showError(data.error || 'Failed to create room');
      }
    } catch {
      showError('Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <MobileHeader />
      <div className="max-w-md mx-auto p-4 pt-20 space-y-6">
        {/* Details */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Room Details</h2>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Coaching Session"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this session cover?"
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white resize-none"
            />
          </div>
        </GlassCard>

        {/* Room type */}
        <GlassCard className="p-4 space-y-3">
          <h2 className="font-semibold text-lg">Type</h2>
          <div className="grid grid-cols-3 gap-2">
            {ROOM_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setRoomType(type.value)}
                className={`py-3 rounded-lg text-center text-sm ${
                  roomType === type.value
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="text-xl mb-1">{type.icon}</div>
                {type.label}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Capacity */}
        <GlassCard className="p-4 space-y-3">
          <h2 className="font-semibold text-lg">Max Participants</h2>
          <div className="flex gap-2">
            {[5, 10, 15, 20, 30, 50].map((n) => (
              <button
                key={n}
                onClick={() => setMaxParticipants(n)}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  maxParticipants === n
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-white/5 text-gray-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Pricing */}
        <GlassCard className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Pricing</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPriceType('free')}
              className={`flex-1 py-2 rounded-lg text-sm ${
                priceType === 'free' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400'
              }`}
            >
              Free
            </button>
            <button
              onClick={() => setPriceType('flat')}
              className={`flex-1 py-2 rounded-lg text-sm ${
                priceType === 'flat' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400'
              }`}
            >
              Flat Fee
            </button>
            <button
              onClick={() => setPriceType('per_minute')}
              className={`flex-1 py-2 rounded-lg text-sm ${
                priceType === 'per_minute' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-gray-400'
              }`}
            >
              Per Min
            </button>
          </div>
          {priceType !== 'free' && (
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                {priceType === 'flat' ? 'Entry Fee (coins)' : 'Rate (coins/min)'}
              </label>
              <input
                type="number"
                value={priceCoins}
                onChange={(e) => setPriceCoins(Math.max(1, parseInt(e.target.value) || 0))}
                min={1}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          )}
        </GlassCard>

        {/* Schedule */}
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Schedule for later</span>
          </div>
          {isScheduled && (
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          )}
          {!isScheduled && (
            <p className="text-xs text-gray-500">Room will be created as an instant room (open immediately)</p>
          )}
        </GlassCard>

        <GlassButton onClick={handleCreate} disabled={creating || !title.trim()} className="w-full">
          {creating ? 'Creating...' : isScheduled ? 'Schedule Room' : 'Create & Open Room'}
        </GlassButton>
      </div>
    </div>
  );
}
