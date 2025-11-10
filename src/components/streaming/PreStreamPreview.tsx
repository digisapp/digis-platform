'use client';

import { useState, useEffect, useRef } from 'react';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type PreStreamPreviewProps = {
  isOpen: boolean;
  onClose: () => void;
  onStartStream: () => void;
  streamTitle: string;
  streamDescription?: string;
};

export function PreStreamPreview({
  isOpen,
  onClose,
  onStartStream,
  streamTitle,
  streamDescription,
}: PreStreamPreviewProps) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      initializeDevices();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  useEffect(() => {
    if (selectedVideoDevice || selectedAudioDevice) {
      startPreview();
    }
  }, [selectedVideoDevice, selectedAudioDevice]);

  const initializeDevices = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Request permissions first
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Get list of devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      // Select default devices
      if (videoInputs.length > 0) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
      if (audioInputs.length > 0) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }

      // Stop temp stream
      tempStream.getTracks().forEach((track) => track.stop());
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error initializing devices:', err);
      setError(err.message || 'Failed to access camera and microphone');
      setIsLoading(false);
    }
  };

  const startPreview = async () => {
    try {
      // Stop previous stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Start new stream with selected devices
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice ? { deviceId: selectedVideoDevice } : true,
        audio: selectedAudioDevice ? { deviceId: selectedAudioDevice } : true,
      });

      setStream(newStream);

      // Connect video
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Setup audio level monitoring
      setupAudioMonitoring(newStream);
    } catch (err: any) {
      console.error('Error starting preview:', err);
      setError('Failed to start preview');
    }
  };

  const setupAudioMonitoring = (mediaStream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);

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

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const level = Math.min(100, (average / 255) * 100 * 2); // Amplify for better visibility

    setAudioLevel(level);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleStartStream = () => {
    cleanup();
    onStartStream();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/90 z-50" />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border-2 border-white/20 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">🎥 Stream Preview</h2>
              <p className="text-gray-400">Test your camera and microphone before going live</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
              <p className="text-sm text-gray-400 mt-2">
                Please allow camera and microphone access in your browser settings.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Video Preview */}
              <div className="aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/10 relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                    Camera preview will appear here
                  </div>
                )}
              </div>

              {/* Device Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Camera Select */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    📹 Camera
                  </label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-digis-cyan transition-colors"
                  >
                    {videoDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Microphone Select */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    🎤 Microphone
                  </label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-digis-cyan transition-colors"
                  >
                    {audioDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audio Level Meter */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">🎤 Microphone Level</span>
                  <span className="text-sm text-gray-400">{Math.round(audioLevel)}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      audioLevel > 70
                        ? 'bg-green-500'
                        : audioLevel > 30
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Speak into your microphone to test the audio level
                </p>
              </div>

              {/* Stream Info */}
              <div className="bg-gradient-to-r from-digis-cyan/10 to-digis-pink/10 rounded-xl border border-digis-cyan/30 p-4">
                <h3 className="font-bold text-white mb-2">Stream Details</h3>
                <p className="text-white mb-1">
                  <span className="text-gray-400">Title:</span> {streamTitle}
                </p>
                {streamDescription && (
                  <p className="text-white">
                    <span className="text-gray-400">Description:</span> {streamDescription}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <GlassButton
                  variant="ghost"
                  size="lg"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="gradient"
                  size="lg"
                  onClick={handleStartStream}
                  disabled={!stream || !!error}
                  className="flex-1"
                  shimmer
                  glow
                >
                  <span className="text-xl mr-2">🔴</span>
                  Start Streaming
                </GlassButton>
              </div>

              {/* Tips */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="text-sm font-bold text-blue-400 mb-2">💡 Tips for a Great Stream</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Make sure you're in a well-lit area</li>
                  <li>• Check that your microphone level is in the green zone</li>
                  <li>• Position your camera at eye level</li>
                  <li>• Find a quiet location to minimize background noise</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
