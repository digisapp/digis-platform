'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseStreamClipperOptions {
  bufferDurationSeconds?: number; // default 30
  onError?: (error: string) => void;
}

export function useStreamClipper(options: UseStreamClipperOptions = {}) {
  const {
    bufferDurationSeconds = 30,
    onError,
  } = options;

  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferSeconds, setBufferSeconds] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [clipCooldownRemaining, setClipCooldownRemaining] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const headerChunkRef = useRef<Blob | null>(null);
  const ringBufferRef = useRef<Blob[]>([]);
  const ringIndexRef = useRef(0);
  const chunkCountRef = useRef(0);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bufferCounterRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastClipTimeRef = useRef(0);
  const isCleanedUpRef = useRef(false);

  // Find a video element with a MediaStream srcObject
  const getVideoStream = useCallback((): MediaStream | null => {
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      if (video.srcObject instanceof MediaStream) {
        return video.srcObject;
      }
    }
    return null;
  }, []);

  // Detect supported MIME type
  const getSelectedMimeType = useCallback((): string => {
    if (typeof MediaRecorder === 'undefined') return '';

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return '';
  }, []);

  // Start the MediaRecorder rolling buffer
  const startBuffering = useCallback((stream: MediaStream) => {
    if (isCleanedUpRef.current) return;

    const mimeType = getSelectedMimeType();
    if (!mimeType) {
      setIsSupported(false);
      onError?.('Clipping not supported on this browser');
      return;
    }

    mimeTypeRef.current = mimeType;

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_000_000, // 4 Mbps (lower than recording for smaller clip files)
        audioBitsPerSecond: 128_000,
      });

      // Reset buffer state
      headerChunkRef.current = null;
      ringBufferRef.current = new Array(bufferDurationSeconds);
      ringIndexRef.current = 0;
      chunkCountRef.current = 0;
      setBufferSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;

        if (chunkCountRef.current === 0) {
          // First chunk = Initialization Segment (WebM header)
          headerChunkRef.current = event.data;
        } else {
          // Subsequent chunks = Clusters, store in ring buffer
          const idx = (ringIndexRef.current) % bufferDurationSeconds;
          ringBufferRef.current[idx] = event.data;
          ringIndexRef.current++;
        }
        chunkCountRef.current++;
      };

      recorder.onerror = (event) => {
        console.error('[StreamClipper] MediaRecorder error:', event);
      };

      recorder.onstop = () => {
        // Recorder stopped (page unmount or stream change)
        setIsBuffering(false);
      };

      // Start recording with 1-second timeslice for the ring buffer
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      activeStreamRef.current = stream;
      setIsBuffering(true);

      // Track buffer fill level
      if (bufferCounterRef.current) clearInterval(bufferCounterRef.current);
      bufferCounterRef.current = setInterval(() => {
        const totalClusters = chunkCountRef.current - 1; // minus header
        const available = Math.min(Math.max(totalClusters, 0), bufferDurationSeconds);
        setBufferSeconds(available);
      }, 1000);

    } catch (err) {
      console.error('[StreamClipper] Failed to start MediaRecorder:', err);
      onError?.('Failed to start clip buffer');
    }
  }, [bufferDurationSeconds, getSelectedMimeType, onError]);

  // Stop the current MediaRecorder
  const stopBuffering = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped
      }
    }
    mediaRecorderRef.current = null;
    activeStreamRef.current = null;

    if (bufferCounterRef.current) {
      clearInterval(bufferCounterRef.current);
      bufferCounterRef.current = null;
    }
  }, []);

  // Clip the current buffer - returns a valid WebM Blob
  const clipIt = useCallback(async (): Promise<Blob | null> => {
    const header = headerChunkRef.current;
    if (!header) {
      onError?.('Buffer not ready yet');
      return null;
    }

    const totalClusters = chunkCountRef.current - 1;
    const availableCount = Math.min(Math.max(totalClusters, 0), bufferDurationSeconds);

    if (availableCount === 0) {
      onError?.('No video data buffered yet');
      return null;
    }

    // Extract ordered cluster chunks from ring buffer
    const clusters: Blob[] = [];
    const writeIdx = ringIndexRef.current;

    if (totalClusters <= bufferDurationSeconds) {
      // Buffer hasn't wrapped yet - take all available in order
      for (let i = 0; i < availableCount; i++) {
        if (ringBufferRef.current[i]) {
          clusters.push(ringBufferRef.current[i]);
        }
      }
    } else {
      // Buffer has wrapped - read from oldest to newest
      for (let i = 0; i < bufferDurationSeconds; i++) {
        const readIdx = (writeIdx + i) % bufferDurationSeconds;
        if (ringBufferRef.current[readIdx]) {
          clusters.push(ringBufferRef.current[readIdx]);
        }
      }
    }

    if (clusters.length === 0) {
      onError?.('No clip data available');
      return null;
    }

    // Assemble valid WebM: header (Initialization Segment) + Clusters
    const mimeType = mimeTypeRef.current || 'video/webm';
    const blob = new Blob([header, ...clusters], { type: mimeType });

    // Set cooldown
    lastClipTimeRef.current = Date.now();
    setClipCooldownRemaining(bufferDurationSeconds);

    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastClipTimeRef.current) / 1000);
      const remaining = Math.max(bufferDurationSeconds - elapsed, 0);
      setClipCooldownRemaining(remaining);
      if (remaining === 0 && cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    }, 1000);

    return blob;
  }, [bufferDurationSeconds, onError]);

  // Full cleanup
  const cleanup = useCallback(() => {
    isCleanedUpRef.current = true;
    stopBuffering();

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }

    headerChunkRef.current = null;
    ringBufferRef.current = [];
    ringIndexRef.current = 0;
    chunkCountRef.current = 0;
  }, [stopBuffering]);

  // Auto-start: poll for video element with MediaStream
  useEffect(() => {
    isCleanedUpRef.current = false;

    // Check if MediaRecorder is supported
    if (typeof window !== 'undefined' && typeof MediaRecorder === 'undefined') {
      setIsSupported(false);
      return;
    }

    const mimeType = getSelectedMimeType();
    if (!mimeType) {
      setIsSupported(false);
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      if (isCleanedUpRef.current) return;

      const stream = getVideoStream();

      if (stream && !activeStreamRef.current) {
        // Found a new stream - start buffering
        startBuffering(stream);
      } else if (stream && activeStreamRef.current && stream !== activeStreamRef.current) {
        // Stream changed (e.g., screen share toggle) - restart
        stopBuffering();
        startBuffering(stream);
      } else if (!stream && activeStreamRef.current) {
        // Stream gone - stop
        stopBuffering();
      }
    }, 500);

    return () => {
      cleanup();
    };
  }, [getVideoStream, getSelectedMimeType, startBuffering, stopBuffering, cleanup]);

  const canClip = isBuffering && bufferSeconds > 0 && !isClipping && clipCooldownRemaining === 0;

  return {
    isBuffering,
    bufferSeconds,
    isClipping,
    setIsClipping,
    canClip,
    isSupported,
    clipCooldownRemaining,
    clipIt,
    cleanup,
  };
}
