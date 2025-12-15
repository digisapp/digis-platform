'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react';
// CSS is imported in the page component (src/app/calls/[callId]/page.tsx)
import { Track, facingModeFromLocalTrack, LocalVideoTrack } from 'livekit-client';
import { GlassButton, GlassCard, LoadingSpinner } from '@/components/ui';
import { Mic, MicOff, Video, VideoOff, SwitchCamera, PhoneOff } from 'lucide-react';
import { useToastContext } from '@/context/ToastContext';

interface VideoCallProps {
  callId: string;
}

function CallControls({ callId, onEnd }: { callId: string; onEnd: () => void }) {
  const { showError } = useToastContext();
  const [ending, setEnding] = useState(false);
  const [startTime] = useState(Date.now());
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

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

  const toggleCamera = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(isCameraOff);
      setIsCameraOff(!isCameraOff);
    }
  };

  const flipCamera = async () => {
    if (localParticipant) {
      const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack;
      if (videoTrack) {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        try {
          await videoTrack.restartTrack({
            facingMode: newFacingMode,
          });
          setFacingMode(newFacingMode);
        } catch (error) {
          console.error('Error flipping camera:', error);
        }
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Top bar - Duration and End Call */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl bg-black/60 px-6 py-3 rounded-2xl border border-white/20 flex items-center gap-4">
        <div className="text-white text-center">
          <div className="text-xs text-gray-400">Duration</div>
          <div className="text-xl font-bold">{formatDuration(duration)}</div>
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl bg-black/60 px-4 py-3 rounded-2xl border border-white/20 flex items-center gap-3">
        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-red-500 text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Camera Toggle Button */}
        <button
          onClick={toggleCamera}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isCameraOff
              ? 'bg-red-500 text-white'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>

        {/* Flip Camera Button */}
        <button
          onClick={flipCamera}
          className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-all"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>

        {/* End Call Button */}
        <button
          onClick={handleEndCall}
          disabled={ending}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all disabled:opacity-50"
        >
          {ending ? <LoadingSpinner size="sm" /> : <PhoneOff className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}

export function VideoCall({ callId }: VideoCallProps) {
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
            <p className="mt-4 text-white">Connecting to call...</p>
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
    <div className="min-h-screen bg-black relative">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        className="h-screen"
      >
        <CallControls callId={callId} onEnd={handleEndCall} />

        {/* LiveKit VideoConference component handles all the UI */}
        <VideoConference />

        {/* Audio renderer for voice */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
