'use client';

import { useState } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Ticket, Clock, Coins } from 'lucide-react';

interface AnnounceTicketedStreamModalProps {
  streamId: string;
  currentViewers: number;
  onClose: () => void;
  onSuccess: (ticketedStream: {
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  }) => void;
}

// Time options in minutes
const TIME_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
];

// Quick price presets
const PRICE_PRESETS = [25, 50, 100, 200, 500];

export function AnnounceTicketedStreamModal({
  streamId,
  currentViewers,
  onClose,
  onSuccess,
}: AnnounceTicketedStreamModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketPrice, setTicketPrice] = useState(50);
  const [minutesUntilStart, setMinutesUntilStart] = useState(30);
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (ticketPrice < 10) {
        throw new Error('Minimum ticket price is 10 coins');
      }

      if (minutesUntilStart < 15 || minutesUntilStart > 60) {
        throw new Error('Stream must start between 15-60 minutes from now');
      }

      const response = await fetch(`/api/streams/${streamId}/announce-ticketed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          ticketPrice,
          minutesUntilStart,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to announce ticketed stream');
      }

      onSuccess({
        id: data.ticketedStream.id,
        title: data.ticketedStream.title,
        ticketPrice: data.ticketedStream.ticketPrice,
        startsAt: new Date(data.ticketedStream.scheduledStart),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const startsAt = new Date(Date.now() + minutesUntilStart * 60 * 1000);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-3xl border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.3)] max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Ticket className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Announce Ticketed Stream</h2>
                <p className="text-xs text-gray-400">{currentViewers} viewers watching now</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Optional Title */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Stream Title <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VIP Exclusive Stream"
                className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                maxLength={100}
              />
            </div>

            {/* Ticket Price */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                <Coins className="w-4 h-4 inline mr-1 text-amber-400" />
                Ticket Price
              </label>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 mb-3">
                {PRICE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTicketPrice(preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      ticketPrice === preset
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="relative">
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Math.max(10, parseInt(e.target.value) || 10))}
                  min={10}
                  max={10000}
                  className="w-full px-4 py-3 bg-black/40 border-2 border-amber-500/30 rounded-xl text-white text-xl font-bold focus:outline-none focus:border-amber-500 transition-all pr-20"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-semibold">
                  coins
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Min: 10 coins</p>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                <Clock className="w-4 h-4 inline mr-1 text-cyan-400" />
                Starts In
              </label>

              <div className="grid grid-cols-4 gap-2">
                {TIME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMinutesUntilStart(option.value)}
                    className={`px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                      minutesUntilStart === option.value
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <p className="text-sm text-gray-400 mt-3 text-center">
                Starts at <span className="text-cyan-400 font-semibold">{startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <GlassButton
                type="button"
                variant="ghost"
                size="lg"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                variant="gradient"
                size="lg"
                className="flex-1 !bg-gradient-to-r !from-amber-500 !to-orange-500"
                disabled={loading}
                shimmer
                glow
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="text-white font-bold flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Announce
                  </span>
                )}
              </GlassButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
