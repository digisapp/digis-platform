'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { drawWatermarkOverlay, type WatermarkConfig } from '@/lib/watermark';

interface UseStreamClipperOptions {
  bufferDurationSeconds?: number; // default 30
  watermark?: WatermarkConfig;
  onError?: (error: string) => void;
}

export function useStreamClipper(options: UseStreamClipperOptions = {}) {
  const {
    bufferDurationSeconds = 30,
    watermark,
    onError,
  } = options;

  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferSeconds, setBufferSeconds] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [clipCooldownRemaining, setClipCooldownRemaining] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  // Core recording refs
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

  // Canvas watermark pipeline refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const logoLoadedRef = useRef(false);

  // Stable refs for callbacks that change frequently — prevents pipeline restarts
  // when parent component re-renders with new inline arrow function references
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Keep watermark config in a ref so the draw loop always reads the latest
  // without needing to restart the MediaRecorder pipeline
  const watermarkRef = useRef(watermark);
  useEffect(() => {
    watermarkRef.current = watermark;
  }, [watermark]);

  // Preload logo image once
  useEffect(() => {
    if (!watermark?.logoUrl) return;
    if (logoRef.current?.src === watermark.logoUrl) return; // already loading/loaded

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoLoadedRef.current = true; };
    img.onerror = () => { logoLoadedRef.current = false; };
    img.src = watermark.logoUrl;
    logoRef.current = img;
  }, [watermark?.logoUrl]);

  // Find a video element that's playing a MediaStream (LiveKit video)
  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      if (video.srcObject instanceof MediaStream) {
        return video;
      }
    }
    return null;
  }, []);

  // Convenience: get just the stream
  const getVideoStream = useCallback((): MediaStream | null => {
    const el = getVideoElement();
    return el?.srcObject instanceof MediaStream ? el.srcObject : null;
  }, [getVideoElement]);

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

  // Start canvas draw loop, returns watermarked MediaStream for recording
  const startCanvasPipeline = useCallback((videoEl: HTMLVideoElement, originalStream: MediaStream): MediaStream | null => {
    try {
      // Check canvas capture support
      if (!('captureStream' in HTMLCanvasElement.prototype)) {
        console.warn('[StreamClipper] captureStream not supported, recording without watermark');
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;

      canvasRef.current = canvas;
      videoElRef.current = videoEl;

      // Draw loop: composites video frame + watermark overlay
      const draw = () => {
        if (isCleanedUpRef.current || !canvasRef.current) return;

        // Adapt canvas to video dimension changes (e.g., resolution switch)
        if (videoEl.videoWidth && videoEl.videoHeight) {
          if (canvas.width !== videoEl.videoWidth) canvas.width = videoEl.videoWidth;
          if (canvas.height !== videoEl.videoHeight) canvas.height = videoEl.videoHeight;
        }

        // Draw current video frame
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        // Overlay watermark (reads latest config from ref)
        const wm = watermarkRef.current;
        if (wm) {
          drawWatermarkOverlay(
            ctx,
            canvas.width,
            canvas.height,
            wm.creatorUsername,
            logoRef.current,
            logoLoadedRef.current,
          );
        }

        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      // Capture canvas output at 30fps
      const canvasStream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
      canvasStreamRef.current = canvasStream;

      // Merge: canvas video track + original audio tracks
      const mergedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(t => mergedStream.addTrack(t));
      originalStream.getAudioTracks().forEach(t => mergedStream.addTrack(t));

      return mergedStream;
    } catch (err) {
      console.error('[StreamClipper] Canvas pipeline failed, falling back to raw stream:', err);
      return null;
    }
  }, []); // No deps needed: reads latest values from refs

  // Stop canvas pipeline and release capture stream tracks
  const stopCanvasPipeline = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    // Stop canvas capture stream tracks to release resources
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach(t => t.stop());
      canvasStreamRef.current = null;
    }
    canvasRef.current = null;
    videoElRef.current = null;
  }, []);

  // Whether canvas watermark is enabled (primitive boolean for stable deps)
  const enableWatermark = !!watermark;

  // Start the MediaRecorder rolling buffer
  const startBuffering = useCallback((stream: MediaStream) => {
    if (isCleanedUpRef.current) return;

    const mimeType = getSelectedMimeType();
    if (!mimeType) {
      setIsSupported(false);
      onErrorRef.current?.('Clipping not supported on this browser');
      return;
    }

    mimeTypeRef.current = mimeType;

    try {
      // Decide recording stream: canvas-watermarked or raw
      let recordingStream = stream;

      if (enableWatermark) {
        const videoEl = getVideoElement();
        if (videoEl) {
          const watermarked = startCanvasPipeline(videoEl, stream);
          if (watermarked) {
            recordingStream = watermarked;
          }
          // Falls back to raw stream if canvas setup fails
        }
      }

      const recorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: 4_000_000, // 4 Mbps
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
      onErrorRef.current?.('Failed to start clip buffer');
    }
  }, [bufferDurationSeconds, getSelectedMimeType, getVideoElement, enableWatermark, startCanvasPipeline]);

  // Stop the current MediaRecorder and canvas pipeline
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

    stopCanvasPipeline();

    if (bufferCounterRef.current) {
      clearInterval(bufferCounterRef.current);
      bufferCounterRef.current = null;
    }
  }, [stopCanvasPipeline]);

  // Clip the current buffer - returns a valid WebM Blob
  const clipIt = useCallback(async (): Promise<Blob | null> => {
    const header = headerChunkRef.current;
    if (!header) {
      onErrorRef.current?.('Buffer not ready yet');
      return null;
    }

    const totalClusters = chunkCountRef.current - 1;
    const availableCount = Math.min(Math.max(totalClusters, 0), bufferDurationSeconds);

    if (availableCount === 0) {
      onErrorRef.current?.('No video data buffered yet');
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
      onErrorRef.current?.('No clip data available');
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
  }, [bufferDurationSeconds]);

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
