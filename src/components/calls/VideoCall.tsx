'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { GlassButton, GlassCard, LoadingSpinner } from '@/components/ui';

interface VideoCallProps {
  callId: string;
}

function CallControls({ callId, onEnd }: { callId: string; onEnd: () => void }) {
  const [ending, setEnding] = useState(false);
  const [startTime] = useState(Date.now());
  const [duration, setDuration] = useState(0);

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
      alert('Failed to end call. Please try again.');
    } finally {
      setEnding(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-4 right-4 z-50 glass p-4 rounded-2xl flex items-center space-x-4">
      <div className="text-white">
        <div className="text-sm text-gray-400">Call Duration</div>
        <div className="text-2xl font-bold">{formatDuration(duration)}</div>
      </div>

      <GlassButton
        variant="pink"
        size="lg"
        onClick={handleEndCall}
        disabled={ending}
      >
        {ending ? <LoadingSpinner size="sm" /> : 'End Call'}
      </GlassButton>
    </div>
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
      setServerUrl(data.livekitUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join call');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = useCallback(() => {
    router.push('/calls/history');
  }, [router]);

  const handleEndCall = useCallback(() => {
    router.push('/calls/history');
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
            <GlassButton variant="cyan" onClick={() => router.push('/calls/history')}>
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
