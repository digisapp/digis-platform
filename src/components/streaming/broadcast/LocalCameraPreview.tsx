'use client';

import { useLocalParticipant, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

interface LocalCameraPreviewProps {
  isMirrored?: boolean;
}

/**
 * Shows the local video preview (camera or screen share) for the broadcaster.
 * When screen sharing is active, it takes priority over the camera.
 * Camera is mirrored by default (like iPhone camera app) for front-facing camera.
 */
export function LocalCameraPreview({ isMirrored = true }: LocalCameraPreviewProps) {
  const { localParticipant } = useLocalParticipant();

  // Check for screen share first (takes priority when active)
  const screenShareTrack = localParticipant.getTrackPublication(Track.Source.ScreenShare);
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);

  // Show screen share if active (never mirrored)
  if (screenShareTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: localParticipant, source: Track.Source.ScreenShare, publication: screenShareTrack }}
        className="h-full w-full object-contain"
      />
    );
  }

  // Show camera with optional mirror for front camera
  // Use object-cover to fill portrait containers (like video calls do)
  if (cameraTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: localParticipant, source: Track.Source.Camera, publication: cameraTrack }}
        className="h-full w-full object-cover"
        style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
      />
    );
  }

  // Loading state
  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white/60 text-sm">Starting camera...</p>
      </div>
    </div>
  );
}
