'use client';

import { useEffect, useRef, useState } from 'react';
import { streamAnalytics } from '@/lib/utils/analytics';
import { Volume2, VolumeX, Maximize2, X } from 'lucide-react';

interface LivePlayerProps {
  streamId: string;
  miniOnScroll?: boolean;
}

export default function LivePlayer({ streamId, miniOnScroll = true }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [showMini, setShowMini] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  // Load stream URL
  useEffect(() => {
    let mounted = true;

    const loadStream = async () => {
      try {
        // TODO: Replace with your actual stream URL endpoint
        // This should return HLS/RTMP/WebRTC stream URL
        const response = await fetch(`/api/streams/${streamId}/token`);
        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          // For now, using a placeholder
          // In production, this would be data.streamUrl or data.hlsUrl
          setStreamUrl(data.streamUrl || `/api/streams/${streamId}/hls`);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[LivePlayer] Error loading stream:', error);
        if (mounted) setIsLoading(false);
      }
    };

    loadStream();

    return () => {
      mounted = false;
    };
  }, [streamId]);

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

    if (videoRef.current) {
      videoRef.current.muted = newMutedState;
    }

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
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // Track when player loads
  useEffect(() => {
    if (!isLoading && streamUrl) {
      streamAnalytics.viewedInline('current_user', streamId);
    }
  }, [isLoading, streamUrl, streamId]);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
        <div className="text-white/60 text-sm">Loading stream...</div>
      </div>
    );
  }

  return (
    <>
      {/* Main player */}
      <div ref={containerRef} className={showMini ? 'invisible' : 'relative'}>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted={muted}
          controls={false}
          preload="metadata"
          poster={`/api/streams/poster?streamId=${streamId}`}
          className="w-full h-full object-contain bg-black"
          onLoadedMetadata={() => setIsLoading(false)}
        >
          {streamUrl && <source src={streamUrl} type="application/x-mpegURL" />}
          Your browser does not support video playback.
        </video>

        {/* Control overlay */}
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
              title="Theater Mode"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky mini player */}
      {showMini && (
        <div className="fixed bottom-4 right-4 w-80 z-50 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 bg-black">
          <div className="relative">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted={muted}
              controls={false}
              preload="metadata"
              className="w-full aspect-video object-contain bg-black"
            >
              {streamUrl && <source src={streamUrl} type="application/x-mpegURL" />}
            </video>

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
