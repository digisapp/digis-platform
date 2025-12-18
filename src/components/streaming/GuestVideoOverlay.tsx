'use client';

import { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, X, Maximize2, Minimize2 } from 'lucide-react';
import { useParticipants, useTrackToggle, VideoTrack, AudioTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

interface GuestVideoOverlayProps {
  guestUserId: string;
  guestUsername: string;
  guestDisplayName?: string | null;
  guestAvatarUrl?: string | null;
  requestType: 'video' | 'voice';
  isHost: boolean;
  onRemoveGuest?: () => void;
}

export function GuestVideoOverlay({
  guestUserId,
  guestUsername,
  guestDisplayName,
  guestAvatarUrl,
  requestType,
  isHost,
  onRemoveGuest,
}: GuestVideoOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const participants = useParticipants();

  // Find the guest participant
  const guestParticipant = participants.find(
    (p) => p.identity === guestUserId
  );

  if (!guestParticipant) {
    // Guest hasn't connected yet - show placeholder
    return (
      <div
        className={`absolute z-30 transition-all duration-300 ${
          isExpanded
            ? 'inset-4'
            : 'bottom-20 right-4 w-32 h-24 sm:w-48 sm:h-36'
        }`}
      >
        <div className="w-full h-full bg-black/80 backdrop-blur-md rounded-xl border-2 border-purple-500/50 overflow-hidden shadow-lg">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              {guestAvatarUrl ? (
                <img
                  src={guestAvatarUrl}
                  alt={guestUsername}
                  className="w-12 h-12 rounded-full mx-auto mb-2 object-cover animate-pulse"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 mx-auto mb-2 flex items-center justify-center text-white font-bold animate-pulse">
                  {guestUsername[0]?.toUpperCase()}
                </div>
              )}
              <p className="text-xs text-gray-400">Connecting...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get video and audio tracks
  const videoTrack = guestParticipant.getTrackPublication(Track.Source.Camera);
  const audioTrack = guestParticipant.getTrackPublication(Track.Source.Microphone);

  const hasVideo = videoTrack?.track && !videoTrack.isMuted;
  const hasAudio = audioTrack?.track && !audioTrack.isMuted;

  return (
    <div
      className={`absolute z-30 transition-all duration-300 ${
        isExpanded
          ? 'inset-4'
          : 'bottom-20 right-4 w-32 h-24 sm:w-48 sm:h-36'
      }`}
    >
      <div className="relative w-full h-full bg-black rounded-xl border-2 border-purple-500/50 overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.3)]">
        {/* Video or Avatar */}
        {hasVideo && videoTrack?.track ? (
          <VideoTrack
            trackRef={{ participant: guestParticipant, source: Track.Source.Camera, publication: videoTrack }}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            {guestAvatarUrl ? (
              <img
                src={guestAvatarUrl}
                alt={guestUsername}
                className={`${isExpanded ? 'w-24 h-24' : 'w-10 h-10'} rounded-full object-cover`}
              />
            ) : (
              <div className={`${isExpanded ? 'w-24 h-24 text-4xl' : 'w-10 h-10 text-lg'} rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold`}>
                {guestUsername[0]?.toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Audio Track */}
        {audioTrack?.track && (
          <AudioTrack
            trackRef={{ participant: guestParticipant, source: Track.Source.Microphone, publication: audioTrack }}
          />
        )}

        {/* Guest Label */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg">
            <div className={`w-2 h-2 ${hasAudio ? 'bg-green-400 animate-pulse' : 'bg-red-400'} rounded-full`} />
            <span className="text-xs text-white font-medium truncate max-w-[80px]">
              {guestDisplayName || guestUsername}
            </span>
          </div>

          {/* Audio/Video indicators */}
          <div className="flex items-center gap-1">
            {requestType === 'video' && (
              <div className={`p-1 rounded ${hasVideo ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {hasVideo ? (
                  <Video className="w-3 h-3 text-green-400" />
                ) : (
                  <VideoOff className="w-3 h-3 text-red-400" />
                )}
              </div>
            )}
            <div className={`p-1 rounded ${hasAudio ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {hasAudio ? (
                <Mic className="w-3 h-3 text-green-400" />
              ) : (
                <MicOff className="w-3 h-3 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Controls (Host only) */}
        {isHost && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onRemoveGuest}
              className="p-1.5 bg-red-500/60 backdrop-blur-sm text-white rounded-lg hover:bg-red-500/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Guest Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-purple-500/80 backdrop-blur-sm rounded text-[10px] font-bold text-white">
          GUEST
        </div>
      </div>
    </div>
  );
}
