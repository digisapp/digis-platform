'use client';

import { useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { RefreshCw } from 'lucide-react';

interface CameraFlipControlProps {
  facingMode: 'user' | 'environment';
  onFacingModeChange: (mode: 'user' | 'environment') => void;
  isPortrait: boolean;
}

/**
 * Control button to flip between front and back camera.
 * Must be used inside a LiveKitRoom component.
 */
export function CameraFlipControl({
  facingMode,
  onFacingModeChange,
  isPortrait
}: CameraFlipControlProps) {
  const { localParticipant } = useLocalParticipant();
  const [isFlipping, setIsFlipping] = useState(false);

  const flipCamera = async () => {
    if (isFlipping) return;
    setIsFlipping(true);

    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

      // Get the camera track
      const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);

      if (cameraTrack?.track) {
        // Stop current camera
        await localParticipant.setCameraEnabled(false);

        // Small delay for camera release
        await new Promise(resolve => setTimeout(resolve, 300));

        // Restart camera with new facing mode
        await localParticipant.setCameraEnabled(true, {
          facingMode: newFacingMode,
          resolution: isPortrait
            ? { width: 1080, height: 1920, frameRate: 30 }
            : { width: 1920, height: 1080, frameRate: 30 }
        });

        onFacingModeChange(newFacingMode);
      }
    } catch (error) {
      console.error('Failed to flip camera:', error);
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <button
      onClick={flipCamera}
      disabled={isFlipping}
      className="min-w-[48px] min-h-[48px] p-3 bg-black/70 backdrop-blur-xl rounded-full text-white hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50 border border-white/20 shadow-lg"
      title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
      aria-label={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
    >
      <RefreshCw className={`w-6 h-6 ${isFlipping ? 'animate-spin' : ''}`} />
    </button>
  );
}
