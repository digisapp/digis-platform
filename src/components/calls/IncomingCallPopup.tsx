'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';

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

export function IncomingCallPopup() {
  const router = useRouter();
  const { user, isCreator } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Play ringtone
  const playRingtone = useCallback(() => {
    if (typeof window !== 'undefined' && !audio) {
      const ringtone = new Audio('/sounds/ringtone.mp3');
      ringtone.loop = true;
      ringtone.volume = 0.5;
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

  // Subscribe to real-time call notifications
  useEffect(() => {
    if (!user?.id || !isCreator) return;

    const supabase = createClient();

    // Subscribe to call_requests channel for this creator
    const channel = supabase
      .channel(`call_requests:${user.id}`)
      .on('broadcast', { event: 'new_call' }, (payload) => {
        // New call request received
        fetchPendingCalls();
      })
      .on('broadcast', { event: 'call_cancelled' }, (payload) => {
        // Call was cancelled by fan
        setIncomingCalls(prev => prev.filter(c => c.id !== payload.payload?.callId));
        if (incomingCalls.length <= 1) {
          stopRingtone();
        }
      })
      .subscribe();

    // Initial fetch
    fetchPendingCalls();

    // Poll every 10 seconds as backup
    const interval = setInterval(fetchPendingCalls, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
      stopRingtone();
    };
  }, [user?.id, isCreator, fetchPendingCalls, stopRingtone, incomingCalls.length]);

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
        alert(data.error || 'Failed to accept call');
      }
    } catch (err) {
      alert('Failed to accept call');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject
  const handleReject = async (call: IncomingCall) => {
    setProcessingId(call.id);

    try {
      const response = await fetch(`/api/calls/${call.id}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        setIncomingCalls(prev => prev.filter(c => c.id !== call.id));
        if (incomingCalls.length <= 1) {
          stopRingtone();
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reject call');
      }
    } catch (err) {
      alert('Failed to reject call');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-64 h-64 rounded-full border-2 border-green-500/30 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-80 h-80 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: '2.5s' }} />
        <div className="absolute w-96 h-96 rounded-full border-2 border-green-500/10 animate-ping" style={{ animationDuration: '3s' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Call count indicator */}
        {incomingCalls.length > 1 && (
          <div className="absolute -top-3 -right-3 z-10 px-3 py-1 bg-red-500 rounded-full text-white text-sm font-bold shadow-lg">
            +{incomingCalls.length - 1} more
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 border border-white/10 shadow-2xl shadow-green-500/20">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm font-medium mb-4">
              {currentCall.callType === 'video' ? (
                <Video className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              Incoming {currentCall.callType} call
            </div>
          </div>

          {/* Caller Info */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              {currentCall.fan.avatarUrl ? (
                <img
                  src={currentCall.fan.avatarUrl}
                  alt={currentCall.fan.displayName || currentCall.fan.username}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-green-500 ring-offset-4 ring-offset-gray-900"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-3xl font-bold ring-4 ring-green-500 ring-offset-4 ring-offset-gray-900">
                  {(currentCall.fan.displayName || currentCall.fan.username)[0].toUpperCase()}
                </div>
              )}
              {/* Pulsing indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <Phone className="w-3 h-3 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">
              {currentCall.fan.displayName || currentCall.fan.username}
            </h2>
            <p className="text-gray-400">@{currentCall.fan.username}</p>

            {/* Call rate info */}
            <div className="mt-4 px-4 py-2 bg-white/5 rounded-xl inline-block">
              <span className="text-gray-400 text-sm">Rate: </span>
              <span className="text-digis-cyan font-bold">{currentCall.ratePerMinute} coins/min</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {/* Reject */}
            <button
              onClick={() => handleReject(currentCall)}
              disabled={processingId === currentCall.id}
              className="flex-1 py-4 px-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-2xl text-red-400 font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              Decline
            </button>

            {/* Accept */}
            <button
              onClick={() => handleAccept(currentCall)}
              disabled={processingId === currentCall.id}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl text-white font-bold transition-all hover:scale-105 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
