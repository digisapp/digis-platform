'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, useConnectionState, useRemoteParticipants, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles/themes/default';
import { ConnectionState } from 'livekit-client';
import { Phone, PhoneOff, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';

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
  fan: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  creator: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
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
  const callId = params.callId as string;

  const [callToken, setCallToken] = useState<CallToken | null>(null);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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

  // End call
  const handleEndCall = async () => {
    if (isEnding) return;

    const confirmed = window.confirm('Are you sure you want to end this call?');
    if (!confirmed) return;

    setIsEnding(true);

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

      // Redirect to calls page
      router.push('/calls');
    } catch (err: any) {
      console.error('Error ending call:', err);
      alert('Failed to end call properly. Please try again.');
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-digis-cyan animate-spin mx-auto mb-4" />
          <p className="text-white">Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
            <PhoneOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Call Error</h2>
            <p className="text-gray-400">{error}</p>
          </div>
          <button
            onClick={() => router.push('/calls')}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  if (!callToken || !callData) {
    return null;
  }

  const isVoiceCall = callData.callType === 'voice';

  return (
    <div className="min-h-screen bg-black">
      <LiveKitRoom
        token={callToken.token}
        serverUrl={callToken.wsUrl}
        connect={true}
        onConnected={handleConnected}
        audio={true}
        video={!isVoiceCall}
        className="h-full"
      >
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
          // Video Call UI
          <>
            {/* Call Header */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-bold text-white">
                      Video Call
                    </h1>
                    <p className="text-sm text-gray-400">
                      {callData.fan.displayName || callData.fan.username} ↔️ {callData.creator.displayName || callData.creator.username}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Duration and Cost */}
                    {hasStarted && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-digis-cyan font-mono">
                          {formatDuration(duration)}
                        </div>
                        <div className="text-sm text-gray-400">
                          ~{estimatedCost} coins
                        </div>
                      </div>
                    )}

                    {/* End Call Button */}
                    <button
                      onClick={handleEndCall}
                      disabled={isEnding}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {isEnding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Ending...
                        </>
                      ) : (
                        <>
                          <PhoneOff className="w-4 h-4" />
                          End Call
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Call Area */}
            <div className="pt-20 h-screen">
              <VideoConference />
              <RoomAudioRenderer />
            </div>
          </>
        )}
      </LiveKitRoom>
    </div>
  );
}
