'use client';

import { useState, useEffect, useRef } from 'react';

export function useGoLiveDevices() {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const initialDeviceSetupDone = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Keep ref in sync for cleanup
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  // Restart stream when user changes device selection
  useEffect(() => {
    if (selectedVideoDevice && selectedAudioDevice) {
      if (!initialDeviceSetupDone.current) {
        initialDeviceSetupDone.current = true;
        return;
      }
      startMediaStream();
    }
  }, [selectedVideoDevice, selectedAudioDevice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getUserMediaWithTimeout = (
    constraints: MediaStreamConstraints,
    timeoutMs = 15000,
  ): Promise<MediaStream> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new DOMException('Camera/microphone permission timed out. Please reload and allow access.', 'TimeoutError'));
      }, timeoutMs);

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          clearTimeout(timer);
          resolve(stream);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const setupAudioMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      updateAudioLevel();
    } catch (err) {
      console.error('Error setting up audio monitoring:', err);
    }
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = Math.min(100, (average / 255) * 100 * 3);

    setAudioLevel(normalizedLevel);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const attachStreamToVideo = async (stream: MediaStream) => {
    if (!videoRef.current) return;

    // Ensure playsinline attributes are set (critical for Safari/iOS)
    videoRef.current.setAttribute('playsinline', '');
    videoRef.current.setAttribute('webkit-playsinline', '');

    // Safari GPU compositing bug: cloning the stream forces a fresh rendering pipeline
    videoRef.current.srcObject = stream.clone();

    // Safari needs a brief moment after srcObject is set before play() works
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      await videoRef.current.play();
      setVideoPlaying(true);

      // Force Safari GPU repaint to avoid black screen after play starts
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.style.willChange = 'transform';
          requestAnimationFrame(() => {
            if (videoRef.current) {
              videoRef.current.style.willChange = '';
            }
          });
        }
      });
    } catch (playError) {
      // Autoplay blocked (common on Safari) - user needs to tap to play
      console.warn('[GoLive] Video autoplay blocked:', playError);
      setVideoPlaying(false);
    }
  };

  const initializeDevices = async () => {
    try {
      setDevicesLoading(true);
      setVideoPlaying(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setPreviewError('Camera access is not available. Make sure you are using HTTPS.');
        setDevicesLoading(false);
        return;
      }

      let stream: MediaStream;

      try {
        stream = await getUserMediaWithTimeout({
          video: {
            facingMode: 'user',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (constraintError: any) {
        if (constraintError.name === 'TimeoutError') throw constraintError;
        console.warn('[GoLive] getUserMedia failed with full constraints, retrying minimal:', constraintError);
        stream = await getUserMediaWithTimeout({
          video: { facingMode: 'user' },
          audio: true,
        });
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const currentVideoDevice = videoTrack?.getSettings()?.deviceId || (videoInputs[0]?.deviceId ?? '');
      const currentAudioDevice = audioTrack?.getSettings()?.deviceId || (audioInputs[0]?.deviceId ?? '');

      setMediaStream(stream);
      setPreviewError('');

      await attachStreamToVideo(stream);
      setupAudioMonitoring(stream);

      // Set selected devices AFTER setting up the stream to avoid triggering startMediaStream
      setSelectedVideoDevice(currentVideoDevice);
      setSelectedAudioDevice(currentAudioDevice);
    } catch (err: any) {
      console.error('[GoLive] Error initializing devices:', err);

      if (err.name === 'TimeoutError') {
        setPreviewError('Camera permission timed out. Please reload and click "Allow" when prompted.');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPreviewError('Camera/microphone access denied. Please allow access in your browser settings and reload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPreviewError('No camera or microphone found. Please connect a device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPreviewError('Camera is in use by another app. Please close other apps using the camera.');
      } else {
        setPreviewError('Unable to access camera/microphone. Please grant permissions and reload.');
      }
    } finally {
      setDevicesLoading(false);
    }
  };

  const startMediaStream = async () => {
    try {
      setVideoPlaying(false);

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream;

      try {
        const videoConstraints = {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        };

        stream = await getUserMediaWithTimeout({
          video: videoConstraints,
          audio: {
            deviceId: selectedAudioDevice,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (constraintError: any) {
        if (constraintError.name === 'TimeoutError') throw constraintError;
        console.warn('[GoLive] getUserMedia failed with full constraints, retrying minimal:', constraintError);
        stream = await getUserMediaWithTimeout({
          video: selectedVideoDevice
            ? { deviceId: { exact: selectedVideoDevice } }
            : { facingMode: 'user' },
          audio: selectedAudioDevice
            ? { deviceId: selectedAudioDevice }
            : true,
        });
      }

      // Reset zoom to minimum if device supports it
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min?: number; max?: number } | number[] };
          if (capabilities?.zoom) {
            const zoomCap = capabilities.zoom;
            const minZoom = typeof zoomCap === 'object' && !Array.isArray(zoomCap) && 'min' in zoomCap
              ? zoomCap.min
              : Array.isArray(zoomCap) ? zoomCap[0] : 1;
            await videoTrack.applyConstraints({
              // @ts-expect-error - zoom is a valid constraint on some devices but not in standard typings
              advanced: [{ zoom: minZoom }],
            });
          }
        } catch (zoomError) {
          // Zoom not supported - ignore
        }
      }

      setMediaStream(stream);
      setPreviewError('');

      await attachStreamToVideo(stream);
      setupAudioMonitoring(stream);
    } catch (err: any) {
      console.error('[GoLive] Error starting media stream:', err);
      setPreviewError('Failed to start camera/microphone');
    }
  };

  const handleTapToPlay = async () => {
    if (videoRef.current && mediaStream) {
      try {
        videoRef.current.srcObject = mediaStream.clone();
        await videoRef.current.play();
        setVideoPlaying(true);

        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.style.willChange = 'transform';
            requestAnimationFrame(() => {
              if (videoRef.current) {
                videoRef.current.style.willChange = '';
              }
            });
          }
        });
      } catch (err) {
        console.error('[GoLive] Failed to play video:', err);
      }
    }
  };

  const stopAllTracks = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
  };

  return {
    mediaStream,
    videoDevices,
    audioDevices,
    selectedVideoDevice,
    setSelectedVideoDevice,
    selectedAudioDevice,
    setSelectedAudioDevice,
    audioLevel,
    devicesLoading,
    previewError,
    videoPlaying,
    setVideoPlaying,
    videoRef,
    initializeDevices,
    handleTapToPlay,
    stopAllTracks,
  };
}
