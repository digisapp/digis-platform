'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { drawWatermarkOverlay, type WatermarkConfig } from '@/lib/watermark';

export interface StreamRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number; // in seconds
  startedAt: Date;
  endedAt: Date;
  thumbnailUrl?: string;
}

interface UseStreamRecorderOptions {
  maxDuration?: number; // in seconds, default 30 minutes (1800)
  maxRecordings?: number; // max recordings per stream, default 20
  watermark?: WatermarkConfig;
  onRecordingComplete?: (recording: StreamRecording) => void;
  onError?: (error: string) => void;
}

export function useStreamRecorder(options: UseStreamRecorderOptions = {}) {
  const {
    maxDuration = 1800, // 30 minutes default
    maxRecordings = 20,
    watermark,
    onRecordingComplete,
    onError,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<StreamRecording[]>([]);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<Date | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Watermark canvas pipeline refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const logoLoadedRef = useRef(false);

  // Preload watermark logo
  useEffect(() => {
    if (!watermark?.logoUrl) return;
    if (logoRef.current?.src === watermark.logoUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoLoadedRef.current = true; };
    img.onerror = () => { logoLoadedRef.current = false; };
    img.src = watermark.logoUrl;
    logoRef.current = img;
  }, [watermark?.logoUrl]);

  // Stop canvas pipeline and release resources
  const stopCanvasPipeline = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (canvasStreamRef.current) {
      canvasStreamRef.current.getTracks().forEach(t => t.stop());
      canvasStreamRef.current = null;
    }
    canvasRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopCanvasPipeline();
    };
  }, [stopCanvasPipeline]);

  // Find video element playing a MediaStream
  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      if (video.srcObject instanceof MediaStream) {
        return video;
      }
    }
    return null;
  }, []);

  // Get the video element's stream from the page
  const getVideoStream = useCallback((): MediaStream | null => {
    const el = getVideoElement();
    return el?.srcObject instanceof MediaStream ? el.srcObject : null;
  }, [getVideoElement]);

  // Create watermarked stream via canvas pipeline
  const startCanvasPipeline = useCallback((videoEl: HTMLVideoElement, originalStream: MediaStream): MediaStream | null => {
    if (!watermark) return null;

    try {
      if (!('captureStream' in HTMLCanvasElement.prototype)) {
        console.warn('[StreamRecorder] captureStream not supported, recording without watermark');
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return null;

      canvasRef.current = canvas;

      // Draw loop: video frame + watermark overlay
      const draw = () => {
        if (!canvasRef.current) return;

        // Adapt canvas to video resolution changes
        if (videoEl.videoWidth && videoEl.videoHeight) {
          if (canvas.width !== videoEl.videoWidth) canvas.width = videoEl.videoWidth;
          if (canvas.height !== videoEl.videoHeight) canvas.height = videoEl.videoHeight;
        }

        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        drawWatermarkOverlay(
          ctx,
          canvas.width,
          canvas.height,
          watermark.creatorUsername,
          logoRef.current,
          logoLoadedRef.current,
        );

        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      // Capture canvas at 30fps
      const canvasStream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
      canvasStreamRef.current = canvasStream;

      // Merge: canvas video + original audio
      const mergedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(t => mergedStream.addTrack(t));
      originalStream.getAudioTracks().forEach(t => mergedStream.addTrack(t));

      return mergedStream;
    } catch (err) {
      console.error('[StreamRecorder] Canvas pipeline failed, recording without watermark:', err);
      return null;
    }
  }, [watermark]);

  const startRecording = useCallback(async () => {
    if (isRecording) {
      onError?.('Already recording');
      return false;
    }

    if (recordings.length >= maxRecordings) {
      const errorMsg = `Maximum ${maxRecordings} recordings per stream`;
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }

    try {
      // Get the video stream
      let stream = getVideoStream();

      if (!stream) {
        // Fallback: Try to get user's camera/mic directly
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (e) {
          const errorMsg = 'Unable to access video stream for recording';
          setError(errorMsg);
          onError?.(errorMsg);
          return false;
        }
      }

      streamRef.current = stream;

      // Route through canvas pipeline for watermark if configured
      if (watermark) {
        const videoEl = getVideoElement();
        if (videoEl) {
          const watermarked = startCanvasPipeline(videoEl, stream);
          if (watermarked) {
            stream = watermarked;
          }
        }
      }

      // Check for supported MIME types
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        const errorMsg = 'No supported video format for recording';
        setError(errorMsg);
        onError?.(errorMsg);
        stopCanvasPipeline();
        return false;
      }

      // Create MediaRecorder with high quality settings
      // 8 Mbps for crisp 1080p that holds up when cropped to portrait for Instagram/TikTok
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 8000000, // 8 Mbps for high quality
        audioBitsPerSecond: 192000, // 192 kbps audio
      });

      chunksRef.current = [];
      startTimeRef.current = new Date();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const endTime = new Date();
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        const duration = startTimeRef.current
          ? Math.round((endTime.getTime() - startTimeRef.current.getTime()) / 1000)
          : 0;

        const recording: StreamRecording = {
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          blob,
          url,
          duration,
          startedAt: startTimeRef.current || endTime,
          endedAt: endTime,
        };

        setRecordings((prev) => [...prev, recording]);
        onRecordingComplete?.(recording);

        // Clear interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        setCurrentDuration(0);
        setIsRecording(false);
        stopCanvasPipeline();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMsg = 'Recording error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsRecording(false);
        stopCanvasPipeline();
      };

      // Start recording - collect data every second for smoother handling
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setError(null);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setCurrentDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      const errorMsg = 'Failed to start recording';
      setError(errorMsg);
      onError?.(errorMsg);
      stopCanvasPipeline();
      return false;
    }
  }, [isRecording, recordings.length, maxRecordings, maxDuration, watermark, getVideoStream, getVideoElement, startCanvasPipeline, stopCanvasPipeline, onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    // Canvas pipeline cleanup happens in mediaRecorder.onstop
  }, []);

  const deleteRecording = useCallback((recordingId: string) => {
    setRecordings((prev) => {
      const recording = prev.find((r) => r.id === recordingId);
      if (recording) {
        URL.revokeObjectURL(recording.url);
      }
      return prev.filter((r) => r.id !== recordingId);
    });
  }, []);

  const clearAllRecordings = useCallback(() => {
    recordings.forEach((recording) => {
      URL.revokeObjectURL(recording.url);
    });
    setRecordings([]);
  }, [recordings]);

  // Format duration as MM:SS or HH:MM:SS
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordings,
    currentDuration,
    formattedDuration: formatDuration(currentDuration),
    maxDuration,
    maxRecordings,
    remainingRecordings: maxRecordings - recordings.length,
    error,
    startRecording,
    stopRecording,
    deleteRecording,
    clearAllRecordings,
    formatDuration,
  };
}
