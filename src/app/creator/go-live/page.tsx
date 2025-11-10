'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';

export default function GoLivePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  // Device preview state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [previewError, setPreviewError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    checkCreatorStatus();
    initializeDevices();

    return () => {
      // Cleanup
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start media stream when devices are selected
  useEffect(() => {
    if (selectedVideoDevice && selectedAudioDevice) {
      startMediaStream();
    }
  }, [selectedVideoDevice, selectedAudioDevice]);

  const checkCreatorStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Check if user is a creator
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.user?.role === 'creator') {
        setIsCreator(true);
      } else {
        setError('You need to be a creator to start streaming');
      }
    } catch (err) {
      setError('Failed to verify creator status');
    } finally {
      setLoading(false);
    }
  };

  const initializeDevices = async () => {
    try {
      setDevicesLoading(true);

      // Request permissions first
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Get available devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      // Set default devices
      if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      // Stop temp stream
      tempStream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      console.error('Error initializing devices:', err);
      setPreviewError('Unable to access camera/microphone. Please grant permissions.');
    } finally {
      setDevicesLoading(false);
    }
  };

  const startMediaStream = async () => {
    try {
      // Stop existing stream
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedVideoDevice },
        audio: { deviceId: selectedAudioDevice },
      });

      setMediaStream(stream);
      setPreviewError('');

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Setup audio monitoring
      setupAudioMonitoring(stream);
    } catch (err: any) {
      console.error('Error starting media stream:', err);
      setPreviewError('Failed to start camera/microphone');
    }
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

  const handleStartStream = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a stream title');
      return;
    }

    if (!mediaStream) {
      setError('Camera/microphone not ready. Please check your devices.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/streams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Stop preview stream before redirecting
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        // Redirect to broadcast studio
        router.push(`/stream/broadcast/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to start stream');
      }
    } catch (err) {
      setError('Failed to start stream. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-8 text-center">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-2xl font-bold text-white mb-4">Creator Access Required</h1>
          <p className="text-gray-400 mb-6">
            You need to be a verified creator to start live streaming.
          </p>
          <GlassButton
            variant="gradient"
            size="lg"
            onClick={() => router.push('/creator/apply')}
            className="w-full"
            shimmer
            glow
          >
            Apply to Be a Creator
          </GlassButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-4xl font-bold text-white mb-2">Go Live</h1>
          <p className="text-gray-400">
            Set up your stream and test your devices before going live
          </p>
        </div>

        {/* 2-Column Layout */}
        <form onSubmit={handleStartStream} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left Column: Form */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Stream Details</h2>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
                  Stream Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your stream about?"
                  className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                  maxLength={100}
                  required
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {title.length}/100
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-white mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what to expect..."
                  className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {description.length}/500
                </div>
              </div>

              {/* Pre-Stream Tips */}
              <div className="bg-digis-cyan/10 border border-digis-cyan/30 rounded-xl p-4">
                <h3 className="text-sm font-bold text-digis-cyan mb-2">💡 Quick Tips</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Check your preview on the right</li>
                  <li>• Choose a well-lit, quiet location</li>
                  <li>• Engage with viewers in chat</li>
                  <li>• Have fun and be yourself!</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Device Preview */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-white/10 p-8 space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Device Preview</h2>

              {/* Video Preview */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-white/10">
                {devicesLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : previewError ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-red-400 text-sm">{previewError}</p>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Device Selectors */}
              <div className="space-y-4">
                {/* Camera */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    📹 Camera
                  </label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-digis-cyan"
                    disabled={videoDevices.length === 0}
                  >
                    {videoDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Microphone */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    🎤 Microphone
                  </label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-digis-cyan"
                    disabled={audioDevices.length === 0}
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Level */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Audio Level
                  </label>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-digis-cyan to-digis-pink transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {audioLevel > 5 ? '🟢 Microphone active' : '🔴 Speak to test mic'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 max-w-7xl mx-auto">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 max-w-7xl mx-auto">
            <GlassButton
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="gradient"
              size="lg"
              disabled={!title.trim() || !mediaStream || isCreating}
              className="flex-1"
              shimmer
              glow
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Starting Stream...</span>
                </>
              ) : (
                <>
                  <span className="text-xl mr-2">📹</span>
                  Start Streaming
                </>
              )}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
}
