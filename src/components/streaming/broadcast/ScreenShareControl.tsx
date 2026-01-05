'use client';

import { useState } from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import { Monitor, MonitorOff } from 'lucide-react';

interface ScreenShareControlProps {
  isScreenSharing: boolean;
  onScreenShareChange: (sharing: boolean) => void;
}

/**
 * Control button for screen sharing in broadcast studio.
 * Must be used inside a LiveKitRoom component.
 */
export function ScreenShareControl({
  isScreenSharing,
  onScreenShareChange
}: ScreenShareControlProps) {
  const { localParticipant } = useLocalParticipant();
  const [isToggling, setIsToggling] = useState(false);

  const toggleScreenShare = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      const newState = !isScreenSharing;
      await localParticipant.setScreenShareEnabled(newState);
      onScreenShareChange(newState);
    } catch (error) {
      console.error('Failed to toggle screen share:', error);
      // User may have cancelled the screen share picker
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={toggleScreenShare}
      disabled={isToggling}
      className={`flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-xl rounded-full border font-semibold text-sm transition-all ${
        isScreenSharing
          ? 'bg-green-500/30 border-green-500/60 text-green-400 hover:bg-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
          : 'bg-black/60 border-white/20 text-white hover:border-green-500/60 hover:bg-black/80'
      } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
      title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
    >
      {isScreenSharing ? (
        <MonitorOff className="w-4 h-4 text-green-400" />
      ) : (
        <Monitor className="w-4 h-4 text-white" />
      )}
      <span className="text-sm hidden sm:inline">{isScreenSharing ? 'Stop Share' : 'Screen'}</span>
    </button>
  );
}
