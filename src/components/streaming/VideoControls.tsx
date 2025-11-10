'use client';

import { useState, useEffect } from 'react';

type VideoControlsProps = {
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
  onToggleTheater?: () => void;
  isMuted?: boolean;
  isFullscreen?: boolean;
  isTheaterMode?: boolean;
  showTheaterMode?: boolean;
};

export function VideoControls({
  onToggleMute,
  onToggleFullscreen,
  onToggleTheater,
  isMuted = false,
  isFullscreen = false,
  isTheaterMode = false,
  showTheaterMode = true,
}: VideoControlsProps) {
  const [volume, setVolume] = useState(100);
  const [showControls, setShowControls] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-hide controls after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    setHideTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);

    if (hideTimeout) clearTimeout(hideTimeout);

    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    setHideTimeout(timeout);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);

    // Update all audio/video elements
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((element: any) => {
      element.volume = newVolume / 100;
    });
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowControls(true)}
    >
      {/* Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pointer-events-auto transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Mute Button */}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className="text-white hover:text-digis-cyan transition-colors p-2 hover:bg-white/10 rounded-lg"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          )}

          {/* Volume Slider */}
          <div className="flex items-center gap-2 group">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-digis-cyan transition-all"
            />
            <span className="text-white text-sm font-semibold w-10">{volume}%</span>
          </div>

          <div className="flex-1" />

          {/* Theater Mode Button */}
          {showTheaterMode && onToggleTheater && (
            <button
              onClick={onToggleTheater}
              className={`text-white hover:text-digis-cyan transition-colors p-2 hover:bg-white/10 rounded-lg ${
                isTheaterMode ? 'bg-white/20' : ''
              }`}
              title={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </button>
          )}

          {/* Fullscreen Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="text-white hover:text-digis-cyan transition-colors p-2 hover:bg-white/10 rounded-lg"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Theater Mode Indicator */}
      {isTheaterMode && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 pointer-events-none">
          <span className="text-white text-sm font-semibold">🎭 Theater Mode</span>
        </div>
      )}
    </div>
  );
}
