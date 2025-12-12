'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { streamAnalytics } from '@/lib/utils/analytics';
import { Volume2, VolumeX, Maximize2, X } from 'lucide-react';

interface LivePlayerProps {
  streamId: string;
  miniOnScroll?: boolean;
  previewMode?: boolean; // Hide controls for embed previews
}

// Component to display only the broadcaster's video
function BroadcasterVideoPreview({ onConnectionChange }: { onConnectionChange: (connected: boolean) => void }) {
  const participants = useRemoteParticipants();
  const hasNotifiedRef = useRef(false);

  // Find the first participant with a camera track (the broadcaster)
  const broadcaster = participants.find(p => {
    const cameraTrack = p.getTrackPublication(Track.Source.Camera);
    return cameraTrack && cameraTrack.track;
  });

  // Notify parent about connection state
  useEffect(() => {
    if (broadcaster && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onConnectionChange(true);
    }
  }, [broadcaster, onConnectionChange]);

  if (!broadcaster) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">Connecting...</p>
        </div>
      </div>
    );
  }

  const cameraTrack = broadcaster.getTrackPublication(Track.Source.Camera);

  if (!cameraTrack || !cameraTrack.track) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white/60 text-sm">Waiting for video...</p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={{ participant: broadcaster, source: Track.Source.Camera, publication: cameraTrack }}
      className="h-full w-full object-cover"
    />
  );
}

export default function LivePlayer({ streamId, miniOnScroll = true, previewMode = false }: LivePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [showMini, setShowMini] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load stream token
  useEffect(() => {
    let mounted = true;

    const loadStream = async () => {
      try {
        const response = await fetch(`/api/streams/${streamId}/token`);
        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
          setServerUrl(data.serverUrl);
          setIsLoading(false);

          // Set a timeout - if not connected within 15 seconds, consider it failed
          connectionTimeoutRef.current = setTimeout(() => {
            if (!isConnected && mounted) {
              console.log('[LivePlayer] Connection timeout - closing preview');
              setConnectionFailed(true);
            }
          }, 15000);
        } else {
          if (mounted) {
            setIsLoading(false);
            setConnectionFailed(true);
          }
        }
      } catch (error) {
        console.error('[LivePlayer] Error loading stream:', error);
        if (mounted) {
          setIsLoading(false);
          setConnectionFailed(true);
        }
      }
    };

    loadStream();

    return () => {
      mounted = false;
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [streamId]);

  // Handle connection state change from video component
  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    if (connected && connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
  }, []);

  // Auto-mute on scroll (sticky mini-player)
  useEffect(() => {
    if (!miniOnScroll || !containerRef.current) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        if (!containerRef.current) {
          ticking = false;
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const playerHeight = rect.height;
        const scrolledPast = window.scrollY > playerHeight * 0.6;

        if (scrolledPast !== showMini) {
          setShowMini(scrolledPast);
          if (scrolledPast) {
            setMuted(true);
            streamAnalytics.miniPlayerShown(streamId);
          }
        }

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [streamId, miniOnScroll, showMini]);

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !muted;
    setMuted(newMutedState);

    // Track analytics
    if (newMutedState) {
      streamAnalytics.playerMuted(streamId);
    } else {
      streamAnalytics.playerUnmuted(streamId);
    }
  };

  // Close mini player
  const closeMiniPlayer = () => {
    setShowMini(false);
  };

  // Track when player loads
  useEffect(() => {
    if (!isLoading && token) {
      streamAnalytics.viewedInline('current_user', streamId);
    }
  }, [isLoading, token, streamId]);

  // If connection failed, don't render anything (let the fallback banner show)
  if (connectionFailed) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-2 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
          <div className="text-white/60 text-sm">Loading stream...</div>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return null;
  }

  return (
    <>
      {/* Main player */}
      <div ref={containerRef} className={showMini ? 'invisible' : 'relative w-full h-full'}>
        <LiveKitRoom
          video={false}
          audio={!muted}
          token={token}
          serverUrl={serverUrl}
          className="h-full w-full"
          options={{ adaptiveStream: true, dynacast: true }}
        >
          <BroadcasterVideoPreview onConnectionChange={handleConnectionChange} />
          <RoomAudioRenderer />
        </LiveKitRoom>

        {/* Control overlay - hidden in preview mode */}
        {!previewMode && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={() => {
                  window.location.href = `/live/${streamId}`;
                  streamAnalytics.theaterModeClicked('current_user', streamId);
                }}
                className="p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
                title="Watch Full Screen"
              >
                <Maximize2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky mini player */}
      {showMini && (
        <div className="fixed bottom-4 right-4 w-80 z-50 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
          <div className="relative aspect-video">
            <LiveKitRoom
              video={false}
              audio={!muted}
              token={token}
              serverUrl={serverUrl}
              className="h-full w-full"
              options={{ adaptiveStream: true, dynacast: true }}
            >
              <BroadcasterVideoPreview onConnectionChange={handleConnectionChange} />
              <RoomAudioRenderer />
            </LiveKitRoom>

            {/* Mini player controls */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded bg-black/60 hover:bg-black/80"
                title={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
              <button
                onClick={closeMiniPlayer}
                className="p-1.5 rounded bg-black/60 hover:bg-black/80"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="absolute bottom-2 left-2">
              <span className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white">
                ● LIVE
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
