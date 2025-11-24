'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton, LoadingSpinner } from '@/components/ui';
import { Phone, Clock, DollarSign, Video, X } from 'lucide-react';

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
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const estimatedCost = ratePerMinute * minimumDuration;

  // Cleanup polling and countdown on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Poll for call status
  const startPolling = (id: string) => {
    // Start countdown
    setTimeRemaining(120);
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Poll call status every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/calls/${id}`);
        if (response.ok) {
          const data = await response.json();
          const status = data.call?.status;

          if (status === 'accepted' || status === 'active') {
            // Creator accepted! Redirect to call
            stopPolling();
            router.push(`/calls/${id}`);
          } else if (status === 'rejected') {
            // Creator rejected
            stopPolling();
            setWaiting(false);
            setError('Call request was declined');
            setTimeout(() => {
              setShowModal(false);
              setError('');
            }, 2000);
          }
        }
      } catch (err) {
        console.error('Error polling call status:', err);
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleTimeout = () => {
    stopPolling();
    setWaiting(false);
    setError('Call request timed out. Creator did not respond.');
    setTimeout(() => {
      setShowModal(false);
      setError('');
      setCallId(null);
    }, 3000);
  };

  const handleCancelRequest = () => {
    stopPolling();
    setWaiting(false);
    setCallId(null);
    setShowModal(false);
  };

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
        setCallId(data.call.id);
        setWaiting(true);
        startPolling(data.call.id);
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
        <button
          onClick={() => setShowModal(true)}
          className="min-h-[44px] px-4 md:px-5 py-2.5 rounded-xl font-semibold bg-white/80 hover:bg-white border-2 border-gray-300 hover:border-digis-cyan transition-all flex items-center justify-center gap-2 text-gray-800"
        >
          <Icon className="w-5 h-5" />
          <span className="hidden md:inline">{callType === 'voice' ? 'Voice Call' : 'Video Call'}</span>
        </button>
      )}

      {/* Request Modal - Clean & Simple */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {waiting ? (
              /* Waiting State */
              <div className="text-center py-4">
                <button
                  onClick={handleCancelRequest}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center animate-pulse">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">Waiting for {creatorName}...</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {creatorName} has {timeRemaining} seconds to respond
                </p>

                {/* Countdown Progress Bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-purple-600 transition-all duration-1000"
                    style={{ width: `${(timeRemaining / 120) * 100}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</span>
                </div>

                <button
                  onClick={handleCancelRequest}
                  className="mt-6 px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  Cancel Request
                </button>
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
