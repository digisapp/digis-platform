'use client';

import { useState } from 'react';
import { GlassButton, LoadingSpinner } from '@/components/ui';
import { Phone, Clock, DollarSign } from 'lucide-react';

interface RequestCallButtonProps {
  creatorId: string;
  creatorName: string;
  ratePerMinute: number;
  minimumDuration: number;
  isAvailable: boolean;
}

export function RequestCallButton({
  creatorId,
  creatorName,
  ratePerMinute,
  minimumDuration,
  isAvailable,
}: RequestCallButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const estimatedCost = ratePerMinute * minimumDuration;

  const handleRequest = async () => {
    setError('');
    setRequesting(true);

    try {
      const response = await fetch('/api/calls/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setShowModal(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError(data.error || 'Failed to request call');
      }
    } catch (err) {
      setError('Failed to request call');
    } finally {
      setRequesting(false);
    }
  };

  if (!isAvailable) {
    return (
      <GlassButton variant="secondary" disabled className="w-full">
        <Phone className="w-4 h-4 mr-2" />
        Calls Unavailable
      </GlassButton>
    );
  }

  return (
    <>
      <GlassButton
        variant="gradient"
        onClick={() => setShowModal(true)}
        className="w-full"
        shimmer
      >
        <Phone className="w-4 h-4 mr-2" />
        Request Call
      </GlassButton>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass glass-hover rounded-2xl p-6 max-w-md w-full border border-white/20">
            {success ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-white mb-2">Request Sent!</h3>
                <p className="text-gray-400">
                  {creatorName} will be notified of your call request
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Request Video Call</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-gray-300 mb-4">
                    Request a 1-on-1 video call with <span className="text-digis-cyan font-semibold">{creatorName}</span>
                  </p>

                  <div className="space-y-3 bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-400">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Rate per minute</span>
                      </div>
                      <span className="text-white font-semibold">{ratePerMinute} coins</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Minimum duration</span>
                      </div>
                      <span className="text-white font-semibold">{minimumDuration} min</span>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Estimated hold</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
                          {estimatedCost} coins
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        You&apos;ll be charged based on actual call duration
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <GlassButton
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    variant="gradient"
                    onClick={handleRequest}
                    disabled={requesting}
                    className="flex-1"
                  >
                    {requesting ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span>Requesting...</span>
                      </div>
                    ) : (
                      'Confirm Request'
                    )}
                  </GlassButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
