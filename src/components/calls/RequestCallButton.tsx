'use client';

import { useState } from 'react';
import { GlassButton, LoadingSpinner } from '@/components/ui';
import { Phone, Clock, DollarSign, Video } from 'lucide-react';

interface RequestCallButtonProps {
  creatorId: string;
  creatorName: string;
  ratePerMinute: number;
  minimumDuration: number;
  isAvailable: boolean;
  iconOnly?: boolean;
  callType?: 'video' | 'voice';
}

export function RequestCallButton({
  creatorId,
  creatorName,
  ratePerMinute,
  minimumDuration,
  isAvailable,
  iconOnly = false,
  callType = 'video',
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
        body: JSON.stringify({ creatorId, callType }),
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

  const Icon = callType === 'voice' ? Phone : Video;
  const buttonTitle = callType === 'voice' ? 'Request Voice Call' : 'Request Video Call';
  const buttonText = callType === 'voice' ? 'Request Voice Call' : 'Request Call';
  const gradientClass = callType === 'voice'
    ? 'from-blue-500 to-indigo-500'
    : 'from-green-500 to-emerald-500';

  if (!isAvailable) {
    if (iconOnly) {
      return (
        <button disabled title={`${callType === 'voice' ? 'Voice' : 'Video'} Calls Unavailable`} className="w-11 h-11 rounded-xl font-semibold bg-gray-400 text-white flex items-center justify-center cursor-not-allowed opacity-50">
          <Icon className="w-5 h-5" />
        </button>
      );
    }
    return (
      <GlassButton variant="ghost" disabled className="w-full">
        <Icon className="w-4 h-4 mr-2" />
        Calls Unavailable
      </GlassButton>
    );
  }

  return (
    <>
      {iconOnly ? (
        <button
          onClick={() => setShowModal(true)}
          title={buttonTitle}
          className={`w-11 h-11 rounded-xl font-semibold bg-gradient-to-r ${gradientClass} text-white hover:scale-105 transition-all flex items-center justify-center shadow-fun`}
        >
          <Icon className="w-5 h-5" />
        </button>
      ) : (
        <GlassButton
          variant="gradient"
          onClick={() => setShowModal(true)}
          className="w-full"
          shimmer
        >
          <Icon className="w-4 h-4 mr-2" />
          {buttonText}
        </GlassButton>
      )}

      {/* Request Modal - Clean & Simple */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {success ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">✓</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
                <p className="text-gray-600 text-sm">
                  Waiting for {creatorName} to accept
                </p>
              </div>
            ) : (
              <>
                {/* Close button */}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Icon and Title */}
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {callType === 'voice' ? 'Voice Call' : 'Video Call'}
                  </h3>
                  <p className="text-gray-600 text-sm">with {creatorName}</p>
                </div>

                {/* Cost Info - Clean & Simple */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 text-center border-2 border-purple-200">
                  <p className="text-gray-600 text-sm mb-2 font-medium">Cost per Minute</p>
                  <div className="text-4xl font-bold bg-gradient-to-r from-digis-cyan to-digis-pink bg-clip-text text-transparent">
                    {ratePerMinute}
                  </div>
                  <p className="text-gray-600 text-sm mt-1 font-medium">coins</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Action Buttons - Clean & Simple */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all border border-gray-300"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleRequest}
                    disabled={requesting}
                    className={`flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r ${gradientClass} text-white hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    {requesting ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Accept'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
