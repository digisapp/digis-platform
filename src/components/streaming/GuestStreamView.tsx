'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';
import { LiveKitRoom, useLocalParticipant, useTracks, VideoTrack, AudioTrack } from '@livekit/components-react';
import { Track, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';
import { GlassButton } from '@/components/ui/GlassButton';

interface GuestStreamViewProps {
  streamId: string;
  requestType: 'video' | 'voice';
  onLeave: () => void;
}

function GuestControls({ requestType, onLeave }: { requestType: 'video' | 'voice'; onLeave: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(requestType === 'voice');

  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  }, [localParticipant, isMuted]);

  const toggleVideo = useCallback(async () => {
    if (localParticipant && requestType === 'video') {
      await localParticipant.setCameraEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  }, [localParticipant, isVideoOff, requestType]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl">
      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className={`p-3 rounded-xl transition-all ${
          isMuted
            ? 'bg-red-500/30 text-red-400 border border-red-500/50'
            : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
        }`}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Video Toggle (only for video calls) */}
      {requestType === 'video' && (
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-xl transition-all ${
            isVideoOff
              ? 'bg-red-500/30 text-red-400 border border-red-500/50'
              : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
      )}

      {/* Leave Button */}
      <button
        onClick={onLeave}
        className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
      >
        <PhoneOff className="w-5 h-5" />
      </button>

      {/* Status Label */}
      <div className="px-3 py-1 bg-purple-500/30 border border-purple-500/50 rounded-xl">
        <span className="text-sm font-medium text-purple-400">You're Live as Guest</span>
      </div>
    </div>
  );
}

export function GuestStreamView({ streamId, requestType, onLeave }: GuestStreamViewProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchToken();
  }, [streamId]);

  const fetchToken = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/streams/${streamId}/guest/token`);
      const data = await res.json();

      if (res.ok) {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      } else {
        setError(data.error || 'Failed to connect');
      }
    } catch (err) {
      setError('Failed to connect to stream');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    // The host will remove us, or we can leave
    onLeave();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Connecting to stream...</p>
          <p className="text-sm text-gray-400">Get ready to go live!</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="text-center max-w-md p-6 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <p className="text-red-400 font-medium mb-4">{error}</p>
          <GlassButton variant="ghost" onClick={onLeave}>
            Go Back
          </GlassButton>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return null;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={requestType === 'video'}
      audio={true}
      onDisconnected={handleLeave}
    >
      <GuestControls requestType={requestType} onLeave={handleLeave} />
    </LiveKitRoom>
  );
}
