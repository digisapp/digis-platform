'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseStreamClipperOptions {
  bufferDurationSeconds?: number; // default 30
  onError?: (error: string) => void;
}

/**
 * Stream clipper using restart-based rolling recorder.
 *
 * Instead of a WebM-specific ring buffer (init-segment + clusters),
 * this records continuously and restarts every `bufferDurationSeconds`.
 * Each stop produces a complete, valid blob (WebM or MP4).
 * This works on both desktop (WebM) and iOS Safari (MP4).
 *
 * Watermarking is handled server-side via FFmpeg after upload.
 */
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

  // Core refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const currentChunksRef = useRef<Blob[]>([]);
  const prevSegmentRef = useRef<Blob | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const segmentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bufferCounterRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastClipTimeRef = useRef(0);
  const segmentStartRef = useRef(0);
  const isCleanedUpRef = useRef(false);
  const isRotatingRef = useRef(false);

  // Stable ref for onError
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Find a video element playing a MediaStream (LiveKit video)
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
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return '';
  }, []);

  // Assemble current chunks into a blob
  const assembleBlob = useCallback((chunks: Blob[]): Blob | null => {
    if (chunks.length === 0) return null;
    const mimeType = mimeTypeRef.current || 'video/webm';
    return new Blob(chunks, { type: mimeType });
  }, []);

  // Stop the current MediaRecorder and return its blob via promise
  const stopAndCollect = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(assembleBlob(currentChunksRef.current));
        return;
      }

      const onStop = () => {
        recorder.removeEventListener('stop', onStop);
        resolve(assembleBlob(currentChunksRef.current));
      };
      recorder.addEventListener('stop', onStop);

      try {
        recorder.stop();
      } catch {
        resolve(assembleBlob(currentChunksRef.current));
      }
    });
  }, [assembleBlob]);

  // Start a new MediaRecorder on the given stream
  const startRecorder = useCallback((stream: MediaStream) => {
    if (isCleanedUpRef.current) return;

    const mimeType = mimeTypeRef.current;
    if (!mimeType) return;

    try {
      currentChunksRef.current = [];
      segmentStartRef.current = Date.now();

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
        audioBitsPerSecond: 128_000,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('[StreamClipper] MediaRecorder error:', event);
      };

      // Use timeslice so we get periodic data (helps with buffer tracking)
      // but we keep ALL chunks (no ring buffer) so the blob is always valid
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsBuffering(true);
    } catch (err) {
      console.error('[StreamClipper] Failed to start MediaRecorder:', err);
      onErrorRef.current?.('Failed to start clip buffer');
    }
  }, []);

  // Rotate: stop current recorder, save blob as prev segment, start new one
  const rotateSegment = useCallback(async () => {
    if (isCleanedUpRef.current || isRotatingRef.current) return;
    isRotatingRef.current = true;

    try {
      const blob = await stopAndCollect();
      if (blob && blob.size > 0) {
        prevSegmentRef.current = blob;
      }

      const stream = activeStreamRef.current;
      if (stream && !isCleanedUpRef.current) {
        startRecorder(stream);
      }
    } finally {
      isRotatingRef.current = false;
    }
  }, [stopAndCollect, startRecorder]);

  // Start buffering on a stream
  const startBuffering = useCallback((stream: MediaStream) => {
    if (isCleanedUpRef.current) return;

    const mimeType = getSelectedMimeType();
    if (!mimeType) {
      setIsSupported(false);
      onErrorRef.current?.('Clipping not supported on this browser');
      return;
    }

    mimeTypeRef.current = mimeType;
    activeStreamRef.current = stream;
    prevSegmentRef.current = null;
    setBufferSeconds(0);

    startRecorder(stream);

    // Auto-rotate every bufferDurationSeconds
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
    segmentTimerRef.current = setInterval(() => {
      rotateSegment();
    }, bufferDurationSeconds * 1000);

    // Track how many seconds we've buffered in the current segment
    if (bufferCounterRef.current) clearInterval(bufferCounterRef.current);
    bufferCounterRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - segmentStartRef.current) / 1000);
      const total = prevSegmentRef.current
        ? Math.min(bufferDurationSeconds + elapsed, bufferDurationSeconds)
        : Math.min(elapsed, bufferDurationSeconds);
      setBufferSeconds(total);
    }, 1000);
  }, [bufferDurationSeconds, getSelectedMimeType, startRecorder, rotateSegment]);

  // Stop buffering
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

    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    if (bufferCounterRef.current) {
      clearInterval(bufferCounterRef.current);
      bufferCounterRef.current = null;
    }

    setIsBuffering(false);
  }, []);

  // Clip: stop current recorder, return the blob, restart recording
  const clipIt = useCallback(async (): Promise<Blob | null> => {
    if (isRotatingRef.current) {
      onErrorRef.current?.('Please try again in a moment');
      return null;
    }

    const stream = activeStreamRef.current;
    if (!stream) {
      onErrorRef.current?.('No video stream found');
      return null;
    }

    // Stop current recorder to finalize the blob
    const currentBlob = await stopAndCollect();
    if (!currentBlob || currentBlob.size === 0) {
      onErrorRef.current?.('No video data buffered yet');
      // Restart recording
      startRecorder(stream);
      return null;
    }

    // Use current segment as the clip (it's a complete valid file)
    const clip = currentBlob;

    // Restart recording immediately
    currentChunksRef.current = [];
    prevSegmentRef.current = null;
    segmentStartRef.current = Date.now();
    startRecorder(stream);

    // Reset segment timer
    if (segmentTimerRef.current) clearInterval(segmentTimerRef.current);
    segmentTimerRef.current = setInterval(() => {
      rotateSegment();
    }, bufferDurationSeconds * 1000);

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

    return clip;
  }, [bufferDurationSeconds, stopAndCollect, startRecorder, rotateSegment]);

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

    prevSegmentRef.current = null;
    currentChunksRef.current = [];
  }, [stopBuffering]);

  // Auto-start: poll for video element with MediaStream
  useEffect(() => {
    isCleanedUpRef.current = false;

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
        startBuffering(stream);
      } else if (stream && activeStreamRef.current && stream !== activeStreamRef.current) {
        stopBuffering();
        startBuffering(stream);
      } else if (!stream && activeStreamRef.current) {
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
