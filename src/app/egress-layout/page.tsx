'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useRemoteParticipants, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

/**
 * Custom egress layout page for LiveKit recordings.
 * LiveKit Egress headless Chrome loads this URL with ?url=wss://...&token=...&username=...
 * Renders a speaker layout with a Digis watermark overlay.
 */

function EgressContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const serverUrl = searchParams.get('url') || '';
  const username = searchParams.get('username') || '';

  // Signal to LiveKit egress that rendering is ready
  useEffect(() => {
    // LiveKit Egress waits for this console message before starting capture
    const timer = setTimeout(() => {
      console.log('START_RECORDING');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!token || !serverUrl) {
    return <div style={{ width: '100vw', height: '100vh', background: '#000' }} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <LiveKitRoom token={token} serverUrl={serverUrl} style={{ width: '100%', height: '100%' }}>
        <SpeakerView />
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* Watermark overlay - matches canvas watermark style */}
      {username && (
        <div style={{
          position: 'absolute',
          bottom: '1.5%',
          right: '1.5%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          padding: '8px 14px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '8px',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/digis-logo-white.png"
            alt="Digis"
            style={{ height: '4.5vh', minHeight: '20px', opacity: 0.92 }}
          />
          <span style={{
            color: 'white',
            opacity: 0.92,
            fontSize: 'clamp(12px, 2.4vh, 20px)',
            fontWeight: 600,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            textShadow: '1px 1px 3px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}>
            digis.cc/{username}
          </span>
        </div>
      )}
    </div>
  );
}

function SpeakerView() {
  const participants = useRemoteParticipants();

  // Find the first participant with an active video track
  const speakerTrack = useMemo(() => {
    for (const p of participants) {
      // Prefer screen share over camera
      const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
      if (screenPub?.track) {
        return { publication: screenPub, participant: p, source: Track.Source.ScreenShare };
      }
    }
    for (const p of participants) {
      const cameraPub = p.getTrackPublication(Track.Source.Camera);
      if (cameraPub?.track) {
        return { publication: cameraPub, participant: p, source: Track.Source.Camera };
      }
    }
    return null;
  }, [participants]);

  if (!speakerTrack) {
    return <div style={{ width: '100%', height: '100%', background: '#000' }} />;
  }

  return (
    <VideoTrack
      trackRef={speakerTrack}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}

export default function EgressLayoutPage() {
  return (
    <Suspense fallback={<div style={{ width: '100vw', height: '100vh', background: '#000' }} />}>
      <EgressContent />
    </Suspense>
  );
}
