'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

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
  onRecordingComplete?: (recording: StreamRecording) => void;
  onError?: (error: string) => void;
}

export function useStreamRecorder(options: UseStreamRecorderOptions = {}) {
  const {
    maxDuration = 1800, // 30 minutes default
    maxRecordings = 20,
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Get the video element's stream from the page
  const getVideoStream = useCallback((): MediaStream | null => {
    // Try to find the video element with the stream
    const videoElements = document.querySelectorAll('video');
    for (const video of videoElements) {
      // Check if this video has a srcObject (live stream)
      if (video.srcObject instanceof MediaStream) {
        return video.srcObject;
      }
    }

    // Alternative: Try to get from canvas if video is rendered there
    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const stream = (canvas as HTMLCanvasElement).captureStream(30);
        // Try to get audio from any audio element or the original video
        for (const video of videoElements) {
          if (video.srcObject instanceof MediaStream) {
            const audioTracks = video.srcObject.getAudioTracks();
            audioTracks.forEach(track => stream.addTrack(track));
            break;
          }
        }
        return stream;
      } catch (e) {
        console.error('Failed to capture canvas stream:', e);
      }
    }

    return null;
  }, []);

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
        return false;
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
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
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorMsg = 'Recording error occurred';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsRecording(false);
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
      return false;
    }
  }, [isRecording, recordings.length, maxRecordings, maxDuration, getVideoStream, onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
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
