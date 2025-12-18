'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Phone, PhoneOff, Video, Mic, X, ChevronDown } from 'lucide-react';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';
import { useToastContext } from '@/context/ToastContext';

interface IncomingCall {
  id: string;
  fanId: string;
  callType: 'video' | 'voice';
  ratePerMinute: number;
  estimatedCoins: number;
  requestedAt: string;
  fan: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

// Quick decline reasons
const DECLINE_REASONS = [
  'Busy right now',
  'In a meeting',
  'Taking a break',
  'Try again later',
  'Not available today',
];

export function IncomingCallPopup() {
  const router = useRouter();
  const { user, isCreator } = useAuth();
  const { showError } = useToastContext();
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showDeclineOptions, setShowDeclineOptions] = useState(false);
  const [customReason, setCustomReason] = useState('');

  // Play ringtone
  const playRingtone = useCallback(() => {
    if (typeof window !== 'undefined' && !audio) {
      const ringtone = new Audio('/sounds/ringtone-magic.mp3');
      ringtone.loop = true;
      ringtone.volume = 0.7;
      ringtone.play().catch(() => {});
      setAudio(ringtone);
    }
  }, [audio]);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
    }
  }, [audio]);

  // Fetch pending calls
  const fetchPendingCalls = useCallback(async () => {
    if (!isCreator) return;

    try {
      const response = await fetch('/api/calls/pending');
      if (response.ok) {
        const data = await response.json();
        setIncomingCalls(data.calls || []);

        // Play ringtone if there are new calls
        if (data.calls && data.calls.length > 0) {
          playRingtone();
        } else {
          stopRingtone();
        }
      }
    } catch (err) {
      console.error('Error fetching pending calls:', err);
    }
  }, [isCreator, playRingtone, stopRingtone]);

  // Subscribe to real-time call notifications via Ably
  useEffect(() => {
    if (!user?.id || !isCreator) return;

    let channel: Ably.RealtimeChannel | null = null;
    let mounted = true;

    const setupChannel = async () => {
      try {
        const ably = getAblyClient();

        // Wait for connection
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            ably.connection.once('failed', () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            });
          });
        }

        if (!mounted) return;

        // Subscribe to user notifications channel for call requests
        channel = ably.channels.get(`user:${user.id}:notifications`);

        channel.subscribe('call_request', (message) => {
          // New call request received
          console.log('[IncomingCallPopup] New call request:', message.data);
          fetchPendingCalls();
        });

        channel.subscribe('call_cancelled', (message) => {
          // Call was cancelled by fan
          const callId = message.data?.callId;
          setIncomingCalls(prev => {
            const updated = prev.filter(c => c.id !== callId);
            if (updated.length === 0) {
              stopRingtone();
            }
            return updated;
          });
        });

      } catch (err) {
        console.error('[IncomingCallPopup] Ably setup error:', err);
      }
    };

    setupChannel();

    // Initial fetch
    fetchPendingCalls();

    // Poll every 10 seconds as backup
    const interval = setInterval(fetchPendingCalls, 10000);

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
        // Only detach if the channel is actually attached
        // This prevents "Attach request superseded by subsequent detach request" errors
        if (channel.state === 'attached') {
          channel.detach().catch(() => {});
        }
      }
      clearInterval(interval);
      stopRingtone();
    };
  }, [user?.id, isCreator, fetchPendingCalls, stopRingtone]);

  // Handle accept
  const handleAccept = async (call: IncomingCall) => {
    setProcessingId(call.id);
    stopRingtone();

    try {
      const response = await fetch(`/api/calls/${call.id}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove from list and navigate to call
        setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
        router.push(`/calls/${call.id}`);
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to accept call');
      }
    } catch (err) {
      showError('Failed to accept call');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject with optional reason
  const handleReject = async (call: IncomingCall, reason?: string) => {
    setProcessingId(call.id);
    setShowDeclineOptions(false);
    setCustomReason('');

    try {
      const response = await fetch(`/api/calls/${call.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
        if (incomingCalls.length <= 1) {
          stopRingtone();
        }
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to reject call');
      }
    } catch (err) {
      showError('Failed to reject call');
    } finally {
      setProcessingId(null);
    }
  };

  // Don't render if not a creator or no calls
  if (!isCreator || incomingCalls.length === 0) {
    return null;
  }

  const currentCall = incomingCalls[0];

  return (
    <div className="fixed top-4 right-4 z-[200] w-80 animate-slide-in-right">
      {/* Compact call notification card */}
      <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/20 overflow-hidden">
        {/* Animated top border */}
        <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400 animate-pulse" />

        <div className="p-4">
          {/* Header with call type */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-green-500/20 rounded-full">
              {currentCall.callType === 'video' ? (
                <Video className="w-3 h-3 text-green-400" />
              ) : (
                <Mic className="w-3 h-3 text-green-400" />
              )}
              <span className="text-xs font-medium text-green-400">
                Incoming {currentCall.callType} call
              </span>
            </div>
            {incomingCalls.length > 1 && (
              <span className="px-2 py-0.5 bg-red-500 rounded-full text-white text-xs font-bold">
                +{incomingCalls.length - 1}
              </span>
            )}
          </div>

          {/* Caller Info - Compact */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-shrink-0">
              {currentCall.fan.avatarUrl ? (
                <img
                  src={currentCall.fan.avatarUrl}
                  alt={currentCall.fan.displayName || currentCall.fan.username}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold ring-2 ring-green-500 ring-offset-2 ring-offset-gray-900">
                  {(currentCall.fan.displayName || currentCall.fan.username)?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              {/* Pulsing indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <Phone className="w-2 h-2 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">
                {currentCall.fan.displayName || currentCall.fan.username}
              </h3>
              <p className="text-xs text-gray-400 truncate">@{currentCall.fan.username}</p>
              <p className="text-xs text-digis-cyan font-medium mt-0.5">
                {currentCall.ratePerMinute} coins/min
              </p>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-2">
            {/* Decline */}
            <button
              onClick={() => handleReject(currentCall)}
              disabled={processingId === currentCall.id}
              className="flex-1 py-2.5 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-400 font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <PhoneOff className="w-4 h-4" />
              Decline
            </button>

            {/* Accept */}
            <button
              onClick={() => handleAccept(currentCall)}
              disabled={processingId === currentCall.id}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-white font-semibold text-sm transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              Accept
            </button>
          </div>
        </div>
      </div>

      {/* Subtle slide-in animation */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
