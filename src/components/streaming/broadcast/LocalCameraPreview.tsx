'use client';

import { useState, useEffect } from 'react';
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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showingTip, setShowingTip] = useState(false);

  // Check for screen share first (takes priority when active)
  const screenShareTrack = localParticipant.getTrackPublication(Track.Source.ScreenShare);
  const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);

  // After 5 seconds without camera, check if permission was denied
  useEffect(() => {
    if (cameraTrack?.track || screenShareTrack?.track) return;

    const tipTimer = setTimeout(() => setShowingTip(true), 3000);
    const denyTimer = setTimeout(() => {
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(stream => {
          stream.getTracks().forEach(t => t.stop());
        })
        .catch(() => {
          setPermissionDenied(true);
        });
    }, 6000);

    return () => {
      clearTimeout(tipTimer);
      clearTimeout(denyTimer);
    };
  }, [cameraTrack?.track, screenShareTrack?.track]);

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
  if (cameraTrack?.track) {
    return (
      <VideoTrack
        trackRef={{ participant: localParticipant, source: Track.Source.Camera, publication: cameraTrack }}
        className="h-full w-full object-cover"
        style={isMirrored ? { transform: 'scaleX(-1)' } : undefined}
      />
    );
  }

  // Camera not available — show helpful message
  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="text-center px-6 max-w-sm">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
          {permissionDenied ? (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white/40 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        {permissionDenied ? (
          <>
            <p className="text-red-400 font-semibold text-sm mb-2">Camera access denied</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Go to your browser settings and allow camera access for this site, then refresh the page.
            </p>
          </>
        ) : (
          <>
            <p className="text-white/60 text-sm">Starting camera...</p>
            {showingTip && (
              <p className="text-white/40 text-xs mt-2">
                If prompted, tap &quot;Allow&quot; to enable your camera
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
