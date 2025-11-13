'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ParticleEffect, SuccessAnimation } from '@/components/ui/ParticleEffect';
import { VideoPreviewSkeleton } from '@/components/ui/SkeletonLoader';
import { createClient } from '@/lib/supabase/client';
import { Upload } from 'lucide-react';

// Stream categories
const STREAM_CATEGORIES = [
  'Gaming',
  'Music',
  'Lifestyle',
  'Education',
  'Technology',
  'Art & Design',
  'Fitness',
  'Cooking',
  'Talk Show',
  'Other',
];

// Privacy options
const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can watch' },
  { value: 'followers', label: 'Followers Only', description: 'Only your followers' },
  { value: 'private', label: 'Private', description: 'Invite only' },
];

export default function GoLivePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentStats, setRecentStats] = useState({ avgViewers: 0, totalStreams: 0 });

  // Animation states
  const [showParticles, setShowParticles] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
        // Fetch recent stream stats
        fetchRecentStats();
      } else {
        setError('You need to be a creator to start streaming');
      }
    } catch (err) {
      setError('Failed to verify creator status');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentStats = async () => {
    try {
      const response = await fetch('/api/streams/stats');
      if (response.ok) {
        const data = await response.json();
        setRecentStats({
          avgViewers: data.avgViewers || 0,
          totalStreams: data.totalStreams || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result as string);
      };
      reader.readAsDataURL(file);
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

    if (!category) {
      setError('Please select a category');
      return;
    }

    if (!mediaStream) {
      setError('Camera/microphone not ready. Please check your devices.');
      return;
    }

    setIsCreating(true);
    setError('');
    setShowParticles(true);

    try {
      // Upload thumbnail if exists
      let thumbnailUrl = null;
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append('file', thumbnailFile);
        const uploadResponse = await fetch('/api/upload/thumbnail', {
          method: 'POST',
          body: formData,
        });
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          thumbnailUrl = uploadData.url;
        }
      }

      const response = await fetch('/api/streams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          privacy,
          thumbnail_url: thumbnailUrl,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Show success animation
        setShowSuccess(true);

        // Stop preview stream before redirecting
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        // Redirect after animation
        setTimeout(() => {
          router.push(`/stream/broadcast/${result.data.id}`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to start stream');
        setShowParticles(false);
      }
    } catch (err) {
      setError('Failed to start stream. Please try again.');
      setShowParticles(false);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center p-4">
        <div className="max-w-md w-full glass rounded-2xl border-2 border-purple-200 p-8 text-center">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Creator Access Required</h1>
          <p className="text-gray-700 mb-6">
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
    <div className="min-h-screen bg-pastel-gradient">
      <ParticleEffect trigger={showParticles} />
      <SuccessAnimation show={showSuccess} />

      <div className="container mx-auto px-4 pt-0 md:pt-6 pb-20 md:pb-8">
        {/* Stats */}
        {recentStats.totalStreams > 0 && (
          <div className="flex items-center gap-6 text-sm mb-8">
            <div className="glass rounded-lg px-4 py-2 border border-purple-200">
              <span className="text-gray-600">Avg Viewers:</span>
              <span className="ml-2 font-bold text-digis-cyan">{recentStats.avgViewers}</span>
            </div>
            <div className="glass rounded-lg px-4 py-2 border border-purple-200">
              <span className="text-gray-600">Total Streams:</span>
              <span className="ml-2 font-bold text-digis-purple">{recentStats.totalStreams}</span>
            </div>
          </div>
        )}

        {/* 2-Column Layout */}
        <form onSubmit={handleStartStream} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left Column: Form */}
            <div className="glass rounded-2xl border-2 border-purple-200 p-8 space-y-6 hover:border-digis-cyan/50 transition-all duration-300">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Stream Details</h2>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-800 mb-2">
                  Stream Title *
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your stream about?"
                  className="w-full px-4 py-3 bg-white/50 border-2 border-purple-200 rounded-xl text-gray-900 placeholder-gray-600 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all duration-300"
                  maxLength={100}
                  required
                />
                <div className="mt-2 text-xs text-gray-600 text-right">
                  {title.length}/100
                </div>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-800 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border-2 border-purple-200 rounded-xl text-gray-900 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all duration-300"
                  required
                >
                  <option value="">Select a category...</option>
                  {STREAM_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what to expect..."
                  className="w-full px-4 py-3 bg-white/50 border-2 border-purple-200 rounded-xl text-gray-900 placeholder-gray-600 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all duration-300 resize-none"
                  rows={4}
                  maxLength={500}
                />
                <div className="mt-2 text-xs text-gray-600 text-right">
                  {description.length}/500
                </div>
              </div>

              {/* Privacy Settings */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Privacy *
                </label>
                <div className="space-y-2">
                  {PRIVACY_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        privacy === option.value
                          ? 'border-digis-cyan bg-digis-cyan/10 ring-2 ring-digis-cyan/20'
                          : 'border-purple-200 bg-white/30 hover:border-digis-cyan/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="privacy"
                        value={option.value}
                        checked={privacy === option.value}
                        onChange={(e) => setPrivacy(e.target.value)}
                        className="w-4 h-4 text-digis-cyan focus:ring-digis-cyan"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Thumbnail (Optional)
                </label>
                <div className="space-y-2">
                  {thumbnail ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-200">
                      <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnail(null);
                          setThumbnailFile(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 p-4 bg-white/50 border-2 border-purple-200 rounded-xl hover:border-digis-cyan hover:bg-digis-cyan/10 transition-all duration-300 w-full"
                    >
                      <Upload className="w-6 h-6 text-digis-cyan" />
                      <span className="text-xs font-semibold text-gray-700">Upload Thumbnail</span>
                    </button>
                  )}
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Pre-Stream Tips */}
              <div className="bg-gradient-to-br from-digis-cyan/10 to-digis-purple/10 border border-digis-cyan/30 rounded-xl p-4">
                <h3 className="text-sm font-bold text-digis-cyan mb-2">💡 Quick Tips</h3>
                <ul className="text-sm text-gray-800 space-y-1">
                  <li>• Check your preview on the right</li>
                  <li>• Choose a well-lit, quiet location</li>
                  <li>• Engage with viewers in chat</li>
                  <li>• Have fun and be yourself!</li>
                </ul>
              </div>
            </div>

            {/* Right Column: Device Preview */}
            <div className="glass rounded-2xl border-2 border-purple-200 p-8 space-y-6 hover:border-digis-purple/50 transition-all duration-300">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Device Preview</h2>

              {/* Video Preview */}
              {devicesLoading ? (
                <VideoPreviewSkeleton />
              ) : previewError ? (
                <div className="relative aspect-video bg-gradient-to-br from-red-50 to-pink-50 rounded-xl overflow-hidden border-2 border-red-200">
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-red-600 text-sm font-semibold">{previewError}</p>
                      <button
                        type="button"
                        onClick={initializeDevices}
                        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-purple-200 group">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transition-transform duration-300"
                  />
                  {/* Live indicator */}
                  <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    PREVIEW
                  </div>
                </div>
              )}

              {/* Device Selectors */}
              <div className="space-y-4">
                {/* Camera */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    📹 Camera
                  </label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full px-4 py-2 bg-white/50 border-2 border-purple-200 rounded-lg text-gray-900 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all duration-300"
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
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    🎤 Microphone
                  </label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full px-4 py-2 bg-white/50 border-2 border-purple-200 rounded-lg text-gray-900 focus:outline-none focus:border-digis-cyan focus:ring-2 focus:ring-digis-cyan/20 transition-all duration-300"
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
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Audio Level
                  </label>
                  <div className="relative w-full h-4 bg-white/50 rounded-full overflow-hidden border-2 border-purple-200">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 via-digis-cyan to-digis-pink transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(audioLevel, 100)}%` }}
                    />
                    {/* Peak indicators */}
                    <div className="absolute inset-0 flex items-center px-1">
                      <div className="flex-1 h-px bg-white/30" />
                      <div className="w-px h-full bg-yellow-400/50" style={{ position: 'absolute', left: '70%' }} />
                      <div className="w-px h-full bg-red-400/50" style={{ position: 'absolute', left: '90%' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-700 font-semibold">
                      {audioLevel > 5 ? '🟢 Microphone active' : '🔴 Speak to test mic'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {Math.round(audioLevel)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 max-w-7xl mx-auto animate-shake">
              <p className="text-red-600 text-sm text-center font-semibold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 max-w-7xl mx-auto">
            <GlassButton
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.back()}
              className="flex-1 hover:scale-105 transition-transform duration-300 text-gray-900 font-semibold"
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="gradient"
              size="lg"
              disabled={!title.trim() || !category || !mediaStream || isCreating}
              className="flex-1 relative overflow-hidden group text-white font-semibold"
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
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </>
              )}
            </GlassButton>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
