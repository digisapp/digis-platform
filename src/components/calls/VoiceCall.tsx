'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useLocalParticipant,
  useRemoteParticipants,
  useConnectionState,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { GlassButton, GlassCard, LoadingSpinner } from '@/components/ui';
import { Mic, MicOff, PhoneOff, Phone, Volume2 } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface VoiceCallProps {
  callId: string;
  creatorName?: string;
  creatorAvatar?: string;
}

function VoiceCallControls({
  callId,
  onEnd,
  creatorName,
  creatorAvatar
}: {
  callId: string;
  onEnd: () => void;
  creatorName?: string;
  creatorAvatar?: string;
}) {
  const { showError } = useToastContext();
  const [ending, setEnding] = useState(false);
  const [startTime] = useState(Date.now());
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  const isConnected = connectionState === ConnectionState.Connected;
  const hasRemoteParticipant = remoteParticipants.length > 0;

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const handleEndCall = async () => {
    setEnding(true);
    try {
      const response = await fetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to end call');
      }

      onEnd();
    } catch (error) {
      console.error('Error ending call:', error);
      showError('Failed to end call. Please try again.');
    } finally {
      setEnding(false);
    }
  };

  const toggleMute = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get remote participant name
  const remoteParticipantName = remoteParticipants[0]?.name || creatorName || 'Participant';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-8">
      {/* Call Status */}
      <div className="text-center mb-8">
        {/* Avatar/Placeholder */}
        <div className="relative mb-6">
          {/* Animated ring when connected */}
          {isConnected && hasRemoteParticipant && (
            <div className="absolute -inset-4 rounded-full border-4 border-cyan-500/50 animate-pulse" />
          )}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-[0_0_60px_rgba(99,102,241,0.5)]">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={remoteParticipantName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Phone className="w-16 h-16 text-white" />
            )}
          </div>

          {/* Audio wave animation when speaking */}
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

        {/* Name */}
        <h2 className="text-2xl font-bold text-white mb-2">{remoteParticipantName}</h2>

        {/* Status */}
        <p className="text-gray-400 mb-4">
          {!isConnected && 'Connecting...'}
          {isConnected && !hasRemoteParticipant && 'Waiting for participant...'}
          {isConnected && hasRemoteParticipant && 'Voice Call Connected'}
        </p>

        {/* Duration */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-mono text-lg">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Mute Button */}
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

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          disabled={ending}
          className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-red-500/30"
          title="End Call"
        >
          {ending ? <LoadingSpinner size="md" /> : <PhoneOff className="w-8 h-8" />}
        </button>
      </div>

      {/* Mute indicator */}
      {isMuted && (
        <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
          <MicOff className="w-4 h-4" />
          You are muted
        </p>
      )}
    </div>
  );
}

export function VoiceCall({ callId, creatorName, creatorAvatar }: VoiceCallProps) {
  const router = useRouter();
  const [token, setToken] = useState<string>('');
  const [roomName, setRoomName] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchToken();
  }, [callId]);

  const fetchToken = async () => {
    try {
      const response = await fetch(`/api/calls/${callId}/token`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get call token');
      }

      setToken(data.token);
      setRoomName(data.roomName);
      setServerUrl(data.wsUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join call');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = useCallback(() => {
    router.push('/calls');
  }, [router]);

  const handleEndCall = useCallback(() => {
    router.push('/calls');
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <GlassCard glow="cyan" padding="lg">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-white">Connecting to voice call...</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <GlassCard glow="pink" padding="lg">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-4">Call Error</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <GlassButton variant="cyan" onClick={() => router.push('/calls')}>
              Back to Calls
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}  // Disable video for voice calls
      audio={true}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={handleDisconnect}
    >
      <VoiceCallControls
        callId={callId}
        onEnd={handleEndCall}
        creatorName={creatorName}
        creatorAvatar={creatorAvatar}
      />

      {/* Audio renderer for voice */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
