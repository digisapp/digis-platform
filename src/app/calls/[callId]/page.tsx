'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useConnectionState, useRemoteParticipants, useLocalParticipant, useTracks } from '@livekit/components-react';
import '@livekit/components-styles/themes/default';
import { ConnectionState, Track } from 'livekit-client';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Volume2, Video, VideoOff, X, Clock, Coins, User, Zap, Gift, Send, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';

interface CallToken {
  token: string;
  roomName: string;
  participantName: string;
  wsUrl: string;
}

interface CallData {
  id: string;
  status: string;
  callType: 'video' | 'voice';
  ratePerMinute: number;
  fanId: string;
  creatorId: string;
  fan: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// Component to detect when remote participant disconnects
function RemoteParticipantMonitor({
  onRemoteLeft,
  hasStarted
}: {
  onRemoteLeft: () => void;
  hasStarted: boolean;
}) {
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();
  const [hadRemoteParticipant, setHadRemoteParticipant] = useState(false);

  useEffect(() => {
    // Track if we ever had a remote participant
    if (remoteParticipants.length > 0) {
      setHadRemoteParticipant(true);
    }
  }, [remoteParticipants.length]);

  useEffect(() => {
    // If we had a remote participant and now they're gone, and call has started
    if (hadRemoteParticipant && remoteParticipants.length === 0 && hasStarted && connectionState === ConnectionState.Connected) {
      console.log('Remote participant left the call');
      // Small delay to avoid false positives during reconnection
      const timeout = setTimeout(() => {
        if (remoteParticipants.length === 0) {
          onRemoteLeft();
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [remoteParticipants.length, hadRemoteParticipant, hasStarted, connectionState, onRemoteLeft]);

  return null;
}

// Voice Call UI Component
function VoiceCallUI({
  callId,
  callData,
  duration,
  estimatedCost,
  isEnding,
  onEndCall,
}: {
  callId: string;
  callData: CallData;
  duration: number;
  estimatedCost: number;
  isEnding: boolean;
  onEndCall: () => void;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  const isConnected = connectionState === ConnectionState.Connected;
  const hasRemoteParticipant = remoteParticipants.length > 0;

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const otherParticipant = callData.creator;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8">
      {/* Avatar and Status */}
      <div className="text-center mb-8">
        <div className="relative mb-6">
          {isConnected && hasRemoteParticipant && (
            <div className="absolute -inset-4 rounded-full border-4 border-cyan-500/50 animate-pulse" />
          )}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(99,102,241,0.5)]">
            {otherParticipant.avatarUrl ? (
              <img
                src={otherParticipant.avatarUrl}
                alt={otherParticipant.displayName || otherParticipant.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Phone className="w-16 h-16 text-white" />
            )}
          </div>

          {isConnected && hasRemoteParticipant && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce" />
              <div className="w-1 h-5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.1s]" />
              <div className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {otherParticipant.displayName || otherParticipant.username}
        </h2>

        <p className="text-gray-400 mb-4">
          {!isConnected && 'Connecting...'}
          {isConnected && !hasRemoteParticipant && 'Waiting for participant...'}
          {isConnected && hasRemoteParticipant && 'Voice Call Connected'}
        </p>

        <div className="flex items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
          </div>
          <div className="text-sm text-gray-400">
            ~{estimatedCost} coins
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMute}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isMuted
              ? 'bg-red-500 text-white shadow-red-500/30'
              : 'bg-white/20 text-white hover:bg-white/30 border border-white/20'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </button>

        <button
          onClick={onEndCall}
          disabled={isEnding}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
          title="End Call"
        >
          {isEnding ? <Loader2 className="w-8 h-8 animate-spin" /> : <PhoneOff className="w-8 h-8" />}
        </button>
      </div>

      {isMuted && (
        <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
          <MicOff className="w-4 h-4" />
          You are muted
        </p>
      )}
    </div>
  );
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const callId = params.callId as string;

  const [callToken, setCallToken] = useState<CallToken | null>(null);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Chat and tip state
  const [showChat, setShowChat] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; content: string; timestamp: number }>>([]);
  const [messageInput, setMessageInput] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [tipSending, setTipSending] = useState(false);

  // Fetch call token and data
  useEffect(() => {
    const fetchCallData = async () => {
      try {
        // Get LiveKit token
        const tokenRes = await fetch(`/api/calls/${callId}/token`);
        if (!tokenRes.ok) {
          const errorData = await tokenRes.json();
          throw new Error(errorData.error || 'Failed to get call token');
        }
        const tokenData = await tokenRes.json();
        setCallToken(tokenData);

        // Get call details
        const callRes = await fetch(`/api/calls/${callId}`);
        if (!callRes.ok) {
          throw new Error('Failed to get call details');
        }
        const callDetails = await callRes.json();
        setCallData(callDetails.call);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching call data:', err);
        setError(err.message || 'Failed to load call');
        setLoading(false);
      }
    };

    fetchCallData();
  }, [callId]);

  // Start call when connected
  const handleConnected = async () => {
    if (hasStarted) return;

    try {
      const res = await fetch(`/api/calls/${callId}/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Failed to start call:', errorData.error);
      } else {
        setHasStarted(true);
      }
    } catch (err) {
      console.error('Error starting call:', err);
    }
  };

  // Timer for duration and cost
  useEffect(() => {
    if (!hasStarted) return;

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate estimated cost
  const estimatedCost = callData
    ? Math.ceil(duration / 60) * callData.ratePerMinute
    : 0;

  // Fetch user balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance');
        if (res.ok) {
          const data = await res.json();
          setUserBalance(data.balance || 0);
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    };
    fetchBalance();
  }, []);

  // Determine if current user is the fan (can send tips to creator)
  const isFan = user?.id && callData && user.id === callData.fanId;

  // Send tip to creator
  const handleSendTip = async (amount: number) => {
    if (!callData || tipSending) return;

    if (userBalance < amount) {
      alert(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    setTipSending(true);
    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receiverId: callData.creatorId,
          message: `Tip during video call`,
        }),
      });

      if (response.ok) {
        setUserBalance((prev) => prev - amount);
        // Add a system message to chat
        setChatMessages((prev) => [...prev, {
          id: `tip-${Date.now()}`,
          sender: 'system',
          content: `💰 You sent ${amount} coins!`,
          timestamp: Date.now(),
        }]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send tip');
      }
    } catch (err) {
      console.error('Error sending tip:', err);
      alert('Failed to send tip');
    } finally {
      setTipSending(false);
    }
  };

  // Send chat message (local only for now - could be extended with Supabase realtime)
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    setChatMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      sender: user?.id || 'You',
      content: messageInput,
      timestamp: Date.now(),
    }]);
    setMessageInput('');
  };

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [callEndedByOther, setCallEndedByOther] = useState(false);

  // Subscribe to call events via Ably
  useEffect(() => {
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

        // Subscribe to call channel
        channel = ably.channels.get(`call:${callId}`);

        channel.subscribe('call_ended', (message) => {
          console.log('Call ended by other party:', message.data);
          setCallEndedByOther(true);
          // Navigate to dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        });

        channel.subscribe('call_accepted', (message) => {
          console.log('Call accepted:', message.data);
          // Could trigger UI update if needed
        });

        channel.subscribe('call_rejected', (message) => {
          console.log('Call rejected:', message.data);
          setError('Call was declined');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        });

      } catch (err) {
        console.error('[CallPage] Ably setup error:', err);
      }
    };

    setupChannel();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
        channel.detach().catch(() => {});
      }
    };
  }, [callId, router]);

  // Handle remote participant disconnection (e.g., computer died, browser closed)
  const handleRemoteLeft = useCallback(() => {
    console.log('Remote participant disconnected unexpectedly');
    setCallEndedByOther(true);
    // Try to end the call on our side too
    fetch(`/api/calls/${callId}/end`, { method: 'POST' }).catch(() => {});
    // Navigate to dashboard after delay
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  }, [callId, router]);

  // End call
  const handleEndCall = async () => {
    if (isEnding) return;
    setShowEndConfirm(true);
  };

  const confirmEndCall = async () => {
    setIsEnding(true);
    setShowEndConfirm(false);

    try {
      const res = await fetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to end call');
      }

      const result = await res.json();
      console.log('Call ended:', result);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Error ending call:', err);
      setIsEnding(false);
      // Show error but still try to redirect
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 bottom-10 right-10 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-4 bg-cyan-500/30 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.5)]">
              <Video className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">Connecting...</h2>
          <p className="text-gray-400">Setting up your video call</p>
          <div className="mt-6 flex justify-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 -top-10 -left-10 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="text-center max-w-md mx-auto px-4 relative z-10">
          <div className="backdrop-blur-2xl bg-gradient-to-br from-red-500/10 via-gray-900/60 to-black/40 rounded-3xl p-8 border-2 border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <PhoneOff className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Call Error</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!callToken || !callData) {
    return null;
  }

  const isVoiceCall = callData.callType === 'voice';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[600px] h-[600px] -top-20 -left-20 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] top-1/2 right-0 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[400px] h-[400px] bottom-0 left-1/3 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Call Ended by Other Party Modal */}
      {callEndedByOther && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-cyan-500/40 shadow-[0_0_60px_rgba(34,211,238,0.3)] animate-in zoom-in-95 duration-200">
            <div className="relative text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-cyan-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/40">
                <PhoneOff className="w-10 h-10 text-cyan-400" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Call Ended</h3>
              <p className="text-gray-400 mb-4">The other participant has ended the call.</p>

              {hasStarted && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Duration</span>
                    <span className="font-mono font-bold text-cyan-400">{formatDuration(duration)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Estimated Cost</span>
                    <span className="font-bold text-yellow-400">{estimatedCost} coins</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mt-3" />
            </div>
          </div>
        </div>
      )}

      {/* End Call Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/60 via-gray-900/80 to-black/60 rounded-3xl p-8 max-w-sm w-full border-2 border-red-500/40 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-200">
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 animate-pulse" />
            </div>

            <div className="relative text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/40">
                <PhoneOff className="w-10 h-10 text-red-400" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">End Call?</h3>
              <p className="text-gray-400 mb-2">This will disconnect your video call.</p>

              {hasStarted && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Duration</span>
                    <span className="font-mono font-bold text-cyan-400">{formatDuration(duration)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-400">Estimated Cost</span>
                    <span className="font-bold text-yellow-400">{estimatedCost} coins</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndCall}
                  disabled={isEnding}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30 disabled:opacity-50"
                >
                  {isEnding ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'End Call'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <LiveKitRoom
        token={callToken.token}
        serverUrl={callToken.wsUrl}
        connect={true}
        onConnected={handleConnected}
        audio={true}
        video={!isVoiceCall}
        className="h-full"
      >
        {/* Monitor for remote participant disconnection */}
        <RemoteParticipantMonitor onRemoteLeft={handleRemoteLeft} hasStarted={hasStarted} />

        {isVoiceCall ? (
          // Voice Call UI
          <>
            <VoiceCallUI
              callId={callId}
              callData={callData}
              duration={duration}
              estimatedCost={estimatedCost}
              isEnding={isEnding}
              onEndCall={handleEndCall}
            />
            <RoomAudioRenderer />
          </>
        ) : (
          // Video Call UI - Tron Styled
          <div className="relative z-10 h-screen flex flex-col">
            {/* Futuristic Header */}
            <div className="absolute top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/60 border-b border-cyan-500/30 shadow-[0_4px_30px_rgba(34,211,238,0.2)]">
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  {/* Left - Call Info */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-cyan-500/30 rounded-full blur-md animate-pulse"></div>
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Video Call
                      </h1>
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="text-cyan-400">{callData.fan.displayName || callData.fan.username}</span>
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-purple-400">{callData.creator.displayName || callData.creator.username}</span>
                      </p>
                    </div>
                  </div>

                  {/* Center - Duration & Cost */}
                  <div className="hidden md:flex items-center gap-6">
                    {hasStarted && (
                      <>
                        <div className="flex items-center gap-3 px-4 py-2 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
                          <Clock className="w-5 h-5 text-cyan-400" />
                          <span className="text-2xl font-bold font-mono text-cyan-400">{formatDuration(duration)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                          <Coins className="w-5 h-5 text-yellow-400" />
                          <span className="text-lg font-bold text-yellow-400">~{estimatedCost}</span>
                          <span className="text-sm text-yellow-400/60">coins</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right - End Call */}
                  <button
                    onClick={handleEndCall}
                    disabled={isEnding}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-red-500/30 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isEnding ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="hidden sm:inline">Ending...</span>
                      </>
                    ) : (
                      <>
                        <PhoneOff className="w-5 h-5" />
                        <span className="hidden sm:inline">End Call</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mobile Duration/Cost */}
                {hasStarted && (
                  <div className="md:hidden flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold font-mono text-cyan-400">{formatDuration(duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="font-bold text-yellow-400">~{estimatedCost}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Video Call Area with Sidebar */}
            <div className="flex-1 pt-24 md:pt-20 flex">
              {/* Main Video Area - Centered */}
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full h-full max-w-5xl livekit-container">
                  <VideoConference />
                </div>
              </div>
              <RoomAudioRenderer />

              {/* Chat & Tips Sidebar */}
              {showChat && (
                <div className="w-80 bg-black/60 backdrop-blur-xl border-l border-cyan-500/30 flex flex-col">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-cyan-400" />
                      <span className="font-bold text-white">Chat & Tips</span>
                    </div>
                    <button
                      onClick={() => setShowChat(false)}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Quick Tip Buttons (for fans only) */}
                  {isFan && (
                    <div className="p-4 border-b border-cyan-500/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Gift className="w-4 h-4 text-pink-400" />
                        <span className="text-sm font-semibold text-white">Quick Tips</span>
                        <span className="text-xs text-gray-400 ml-auto">{userBalance} coins</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[5, 10, 25, 50].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => handleSendTip(amount)}
                            disabled={tipSending || userBalance < amount}
                            className="py-2 px-1 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-300 font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {[100, 250, 500].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => handleSendTip(amount)}
                            disabled={tipSending || userBalance < amount}
                            className="py-2 px-1 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 text-yellow-300 font-bold text-sm hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-500 text-sm mt-8">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No messages yet</p>
                        <p className="text-xs mt-1">Chat during your call!</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-2 rounded-lg ${
                            msg.sender === 'system'
                              ? 'bg-yellow-500/20 border border-yellow-500/30 text-center'
                              : 'bg-white/5'
                          }`}
                        >
                          {msg.sender !== 'system' && (
                            <div className="text-xs text-cyan-400 font-semibold mb-1">
                              {msg.sender === user?.id ? 'You' : 'Other'}
                            </div>
                          )}
                          <p className={`text-sm ${msg.sender === 'system' ? 'text-yellow-300' : 'text-white'}`}>
                            {msg.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 border-t border-cyan-500/30">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Send a message..."
                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="p-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg text-white hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Toggle Chat Button (when hidden) */}
              {!showChat && (
                <button
                  onClick={() => setShowChat(true)}
                  className="fixed right-4 top-1/2 -translate-y-1/2 p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 transition-all"
                >
                  <MessageCircle className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        )}
      </LiveKitRoom>

      {/* Custom LiveKit Styles */}
      <style jsx global>{`
        .livekit-container .lk-video-conference {
          --lk-bg: transparent !important;
          --lk-bg2: rgba(0, 0, 0, 0.4) !important;
          --lk-control-bg: rgba(0, 0, 0, 0.6) !important;
          --lk-control-hover-bg: rgba(34, 211, 238, 0.2) !important;
          --lk-accent-fg: rgb(34, 211, 238) !important;
          --lk-danger: rgb(239, 68, 68) !important;
          background: transparent !important;
        }

        .livekit-container .lk-focus-layout {
          background: transparent !important;
        }

        .livekit-container .lk-participant-tile {
          background: rgba(0, 0, 0, 0.6) !important;
          border: 2px solid rgba(34, 211, 238, 0.3) !important;
          border-radius: 1rem !important;
          box-shadow: 0 0 30px rgba(34, 211, 238, 0.2) !important;
        }

        .livekit-container .lk-participant-placeholder {
          background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(168, 85, 247, 0.1)) !important;
        }

        .livekit-container .lk-control-bar {
          background: rgba(0, 0, 0, 0.8) !important;
          backdrop-filter: blur(20px) !important;
          border-top: 1px solid rgba(34, 211, 238, 0.3) !important;
          padding: 1rem !important;
        }

        .livekit-container .lk-button {
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 0.75rem !important;
          transition: all 0.2s !important;
        }

        .livekit-container .lk-button:hover {
          background: rgba(34, 211, 238, 0.2) !important;
          border-color: rgba(34, 211, 238, 0.5) !important;
          transform: scale(1.05) !important;
        }

        .livekit-container .lk-disconnect-button {
          background: linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38)) !important;
          border: none !important;
        }

        .livekit-container .lk-disconnect-button:hover {
          background: linear-gradient(135deg, rgb(220, 38, 38), rgb(185, 28, 28)) !important;
        }

        .livekit-container .lk-participant-name {
          background: rgba(0, 0, 0, 0.7) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(34, 211, 238, 0.3) !important;
          border-radius: 0.5rem !important;
          padding: 0.25rem 0.75rem !important;
        }

        /* Hide the local participant tile in 1:1 calls - show as small PIP instead */
        .livekit-container .lk-focus-layout .lk-carousel {
          position: absolute !important;
          bottom: 1rem !important;
          right: 1rem !important;
          width: 180px !important;
          height: auto !important;
          z-index: 20 !important;
        }

        .livekit-container .lk-focus-layout .lk-carousel .lk-participant-tile {
          width: 180px !important;
          height: 120px !important;
          border-radius: 0.75rem !important;
        }

        /* Make focus view take full space */
        .livekit-container .lk-focus-layout-wrapper {
          height: 100% !important;
        }

        /* Hide placeholder icon when no video */
        .livekit-container .lk-participant-placeholder svg {
          opacity: 0.3 !important;
          width: 48px !important;
          height: 48px !important;
        }

        /* Grid layout for when both participants are visible equally */
        .livekit-container .lk-grid-layout {
          gap: 0.5rem !important;
          padding: 0.5rem !important;
        }

        /* Center the video conference */
        .livekit-container {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .livekit-container .lk-video-conference {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        .livekit-container .lk-focus-layout {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        /* Main participant takes center stage */
        .livekit-container .lk-focus-layout > .lk-participant-tile {
          max-width: 100% !important;
          max-height: 100% !important;
          width: auto !important;
          height: auto !important;
          aspect-ratio: 16/9 !important;
        }
      `}</style>
    </div>
  );
}
