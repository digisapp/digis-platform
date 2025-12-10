'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface Show {
  id: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  roomName: string | null;
}

interface ShowControlsProps {
  show: Show;
  onUpdate: () => void;
}

export function ShowControls({ show, onUpdate }: ShowControlsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleStartShow = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/shows/${show.id}/start`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start stream');
      }

      // Redirect to broadcast page
      if (data.roomName) {
        router.push(`/stream/live/${data.roomName}`);
      } else {
        onUpdate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShow = async () => {
    if (!confirm('Are you sure you want to end this stream? This cannot be undone.')) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/shows/${show.id}/end`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end stream');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end stream');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShow = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/shows/${show.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel stream');
      }

      // Show success message
      alert(`Stream cancelled successfully. ${data.refundedTickets} ticket(s) refunded.`);
      router.push('/creator/streams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel stream');
      setShowCancelConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Start Show Button */}
      {show.status === 'scheduled' && (
        <GlassButton
          variant="gradient"
          size="lg"
          onClick={handleStartShow}
          disabled={loading}
          shimmer
          glow
          className="whitespace-nowrap"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <span className="text-xl mr-2">🎬</span>
              Start Show
            </>
          )}
        </GlassButton>
      )}

      {/* Go to Broadcast */}
      {show.status === 'live' && show.roomName && (
        <GlassButton
          variant="gradient"
          size="lg"
          onClick={() => router.push(`/stream/live/${show.roomName}`)}
          className="whitespace-nowrap"
          shimmer
          glow
        >
          <span className="text-xl mr-2">🎥</span>
          Go to Broadcast
        </GlassButton>
      )}

      {/* End Show Button */}
      {show.status === 'live' && (
        <GlassButton
          variant="ghost"
          size="md"
          onClick={handleEndShow}
          disabled={loading}
          className="whitespace-nowrap text-red-400 hover:text-red-300"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <span className="text-xl mr-2">⏹️</span>
              End Show
            </>
          )}
        </GlassButton>
      )}

      {/* Cancel Show */}
      {show.status === 'scheduled' && (
        <>
          {!showCancelConfirm ? (
            <GlassButton
              variant="ghost"
              size="md"
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
              className="whitespace-nowrap text-red-400 hover:text-red-300"
            >
              Cancel Show
            </GlassButton>
          ) : (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-red-200 text-sm mb-3">
                Are you sure? All tickets will be refunded.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleCancelShow}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm text-white font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
