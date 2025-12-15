'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { GlassButton, LoadingSpinner } from '@/components/ui';
import { Phone, Clock, DollarSign, Video, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SignUpPromptModal } from '@/components/auth/SignUpPromptModal';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';

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
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ablyChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const rejectionHandledRef = useRef(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const estimatedCost = ratePerMinute * minimumDuration;

  // Play ringing sound while waiting for creator to answer
  const playRingtone = useCallback(() => {
    try {
      const ringtone = new Audio('/sounds/ringtone-magic.mp3');
      ringtone.loop = true;
      ringtone.volume = 0.5;
      ringtone.play().catch(() => {});
      ringtoneRef.current = ringtone;
    } catch (err) {
      console.error('Error playing ringtone:', err);
    }
  }, []);

  // Stop ringing sound
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
  }, []);

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  // Handle button click - check auth first
  const handleButtonClick = () => {
    if (isAuthenticated === false) {
      setShowSignUpModal(true);
      return;
    }
    setShowModal(true);
  };

  // Cleanup polling, countdown, Ably, and ringtone on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (ablyChannelRef.current) {
        ablyChannelRef.current.unsubscribe();
        if (ablyChannelRef.current.state === 'attached') {
          ablyChannelRef.current.detach().catch(() => {});
        }
      }
      stopRingtone();
    };
  }, [stopRingtone]);

  // Poll for call status
  const startPolling = (id: string) => {
    // Reset rejection handled flag
    rejectionHandledRef.current = false;

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

    // Subscribe to Ably for real-time call updates
    try {
      const ably = getAblyClient();
      const channel = ably.channels.get(`call:${id}`);
      ablyChannelRef.current = channel;

      // Listen for call_rejected with reason
      channel.subscribe('call_rejected', (message) => {
        if (rejectionHandledRef.current) return;
        rejectionHandledRef.current = true;

        const reason = message.data?.reason;
        stopPolling();
        setWaiting(false);
        setError(reason || 'Call request was declined');
        setTimeout(() => {
          setShowModal(false);
          setError('');
        }, 3000); // Show for 3 seconds so user can read the message
      });

      // Listen for call_accepted
      channel.subscribe('call_accepted', () => {
        stopPolling();
        router.push(`/calls/${id}`);
      });
    } catch (err) {
      console.error('Error setting up Ably subscription:', err);
    }

    // Poll call status every 2 seconds as backup
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
            // Creator rejected - Ably should handle this with reason,
            // but this is a fallback if Ably missed it
            if (rejectionHandledRef.current) return;
            rejectionHandledRef.current = true;

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
    // Cleanup Ably channel
    if (ablyChannelRef.current) {
      ablyChannelRef.current.unsubscribe();
      if (ablyChannelRef.current.state === 'attached') {
        ablyChannelRef.current.detach().catch(() => {});
      }
      ablyChannelRef.current = null;
    }
    // Stop ringtone
    stopRingtone();
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

  const handleCancelRequest = async () => {
    // Cancel the call request on the server so creator is notified
    if (callId) {
      try {
        await fetch(`/api/calls/${callId}/cancel`, { method: 'POST' });
      } catch (err) {
        console.error('Error cancelling call:', err);
      }
    }
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
        playRingtone(); // Play ringing sound while waiting
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
        <button disabled title={`${callType === 'voice' ? 'Voice' : 'Video'} Calls Unavailable`} className="w-10 h-10 rounded-full font-semibold bg-gray-400 text-white flex items-center justify-center cursor-not-allowed opacity-50">
          <Icon className="w-4 h-4" />
        </button>
      );
    }
    return (
      <button
        disabled
        className="px-4 py-2 rounded-full font-semibold bg-gray-600/50 text-gray-400 flex items-center gap-2 cursor-not-allowed text-sm"
      >
        <Icon className="w-4 h-4" />
        <span>{callType === 'voice' ? 'Call' : 'Video'} Unavailable</span>
      </button>
    );
  }

  return (
    <>
      {iconOnly ? (
        <button
          onClick={handleButtonClick}
          title={buttonTitle}
          className={`w-10 h-10 rounded-full font-semibold bg-gradient-to-r ${gradientClass} text-white hover:scale-105 transition-all flex items-center justify-center shadow-lg`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={handleButtonClick}
          className={`px-4 py-2 rounded-full font-semibold text-white hover:scale-105 transition-all flex items-center gap-2 shadow-lg text-sm ${
            callType === 'voice'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-500/30'
              : 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-green-500/30'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{callType === 'voice' ? 'Call' : 'Video Call'}</span>
        </button>
      )}

      {/* Request Modal - Tron Theme - Using Portal to ensure top layer */}
      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] animate-in zoom-in-95 duration-200 mx-auto">
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>
            <div className="relative">
            {waiting ? (
              /* Waiting State */
              <div className="text-center py-4">
                <button
                  onClick={handleCancelRequest}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-2 bg-cyan-500/30 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-2">Waiting for {creatorName}...</h3>
                <p className="text-gray-400 text-sm mb-4">
                  {creatorName} has {timeRemaining} seconds to respond
                </p>

                {/* Countdown Progress Bar */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-6 border border-cyan-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                    style={{ width: `${(timeRemaining / 120) * 100}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-cyan-400">
                  <Clock className="w-4 h-4" />
                  <span>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</span>
                </div>

                <button
                  onClick={handleCancelRequest}
                  className="mt-6 px-6 py-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Cancel Request
                </button>
              </div>
            ) : (
              <>
                {/* Close button */}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Icon and Title */}
                <div className="text-center mb-6">
                  <div className="relative inline-block mb-4">
                    <div className="absolute -inset-2 bg-cyan-500/30 rounded-full blur-xl"></div>
                    <div className={`relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)]`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-1">
                    {callType === 'voice' ? 'Voice Call' : 'Video Call'}
                  </h3>
                  <p className="text-gray-400 text-sm">with {creatorName}</p>
                </div>

                {/* Cost Info - Tron Style */}
                <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl p-6 mb-6 text-center border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                  <p className="text-gray-400 text-sm mb-2 font-medium">Cost per Minute</p>
                  <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {ratePerMinute}
                  </div>
                  <p className="text-gray-400 text-sm mt-1 font-medium">coins</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Action Buttons - Tron Style */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-gray-600"
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
        </div>,
        document.body
      )}

      {/* Sign Up Prompt Modal */}
      <SignUpPromptModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        action={callType === 'voice' ? 'start a voice call' : 'start a video call'}
        creatorName={creatorName}
      />
    </>
  );
}
