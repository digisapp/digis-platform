'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ParticleEffect, SuccessAnimation } from '@/components/ui/ParticleEffect';
import { VideoPreviewSkeleton } from '@/components/ui/SkeletonLoader';
import { FeaturedCreatorSelector } from '@/components/streams/FeaturedCreatorSelector';
import { useToastContext } from '@/context/ToastContext';
import { createClient } from '@/lib/supabase/client';
import { STREAM_CATEGORIES, getSuggestedTags } from '@/lib/constants/stream-categories';

interface FeaturedCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// Privacy options (Ticketed is handled via VIP announcement during live stream)
const PRIVACY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'followers', label: 'Followers Only' },
  { value: 'subscribers', label: 'Subscribers Only' },
];

// Check if device is mobile
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || window.innerWidth < 768;
};

interface ActiveStream {
  id: string;
  title: string;
  currentViewers: number;
  startedAt: string;
}

export default function GoLivePage() {
  const router = useRouter();
  const { showError } = useToastContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentStats, setRecentStats] = useState({ avgViewers: 0, totalStreams: 0 });
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [featuredCreatorCommission, setFeaturedCreatorCommission] = useState(0);
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);

  // Go Private settings
  const [goPrivateEnabled, setGoPrivateEnabled] = useState(true);
  const [goPrivateRate, setGoPrivateRate] = useState<number | null>(null);
  const [goPrivateMinDuration, setGoPrivateMinDuration] = useState<number | null>(null);
  const [defaultCallSettings, setDefaultCallSettings] = useState<{ rate: number; minDuration: number } | null>(null);

  // AI Chat Moderator settings
  const [aiChatModEnabled, setAiChatModEnabled] = useState(false);
  const [hasAiTwin, setHasAiTwin] = useState(false);

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

  // Track actual device orientation (portrait = phone held upright)
  const [deviceOrientation, setDeviceOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Detect actual device orientation
  useEffect(() => {
    const updateDeviceOrientation = () => {
      if (typeof window !== 'undefined') {
        // Check screen orientation API first
        if (screen.orientation) {
          const isPortrait = screen.orientation.type.includes('portrait');
          setDeviceOrientation(isPortrait ? 'portrait' : 'landscape');
        } else {
          // Fallback to window dimensions
          setDeviceOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
        }
      }
    };

    updateDeviceOrientation();

    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', updateDeviceOrientation);
    }
    window.addEventListener('resize', updateDeviceOrientation);
    window.addEventListener('orientationchange', updateDeviceOrientation);

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', updateDeviceOrientation);
      }
      window.removeEventListener('resize', updateDeviceOrientation);
      window.removeEventListener('orientationchange', updateDeviceOrientation);
    };
  }, []);

  useEffect(() => {
    // Auto-detect device type and set orientation
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    // Mobile defaults to portrait, desktop to landscape
    setOrientation(mobile ? 'portrait' : 'landscape');

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

  // Start media stream when devices or orientation change
  useEffect(() => {
    if (selectedVideoDevice && selectedAudioDevice) {
      startMediaStream();
    }
  }, [selectedVideoDevice, selectedAudioDevice, orientation]);

  // On mobile, auto-sync orientation selection with actual device orientation
  useEffect(() => {
    if (isMobile) {
      setOrientation(deviceOrientation);
    }
  }, [deviceOrientation, isMobile]);

  const checkCreatorStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      // Fetch profile, active stream, call settings, and AI settings in parallel for faster load
      const [profileRes, activeRes, callSettingsRes, aiSettingsRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/streams/active'),
        fetch('/api/user/call-settings'),
        fetch('/api/ai/settings')
      ]);

      // Handle auth failures - redirect to login
      if (profileRes.status === 401) {
        console.warn('[GoLive] Session expired, redirecting to login');
        router.push('/');
        return;
      }

      if (!profileRes.ok) {
        setError('Failed to verify creator status. Please try again.');
        return;
      }

      const data = await profileRes.json();

      if (data.user?.role === 'creator') {
        setIsCreator(true);

        // Load creator's default call settings for Go Private defaults
        if (callSettingsRes.ok) {
          const callData = await callSettingsRes.json();
          if (callData.settings) {
            setDefaultCallSettings({
              rate: callData.settings.callRatePerMinute || 50,
              minDuration: callData.settings.minimumCallDuration || 5,
            });
          }
        }

        // Load AI Twin settings for AI Chat Moderator toggle
        if (aiSettingsRes.ok) {
          const aiData = await aiSettingsRes.json();
          if (aiData.settings) {
            // Check if creator has actually configured their AI Twin
            // (either enabled voice/text chat, or has a personality prompt)
            const isConfigured = aiData.settings.enabled ||
                                 aiData.settings.textChatEnabled ||
                                 aiData.settings.personalityPrompt;
            setHasAiTwin(!!isConfigured);
            // Default to their saved preference
            setAiChatModEnabled(aiData.settings.streamChatModEnabled || false);
          }
        }

        // Check if creator already has an active stream
        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (activeData.data?.hasActiveStream && activeData.data?.stream) {
            // Show rejoin option instead of auto-redirecting
            setActiveStream({
              id: activeData.data.stream.id,
              title: activeData.data.stream.title || 'Your Stream',
              currentViewers: activeData.data.stream.currentViewers || 0,
              startedAt: activeData.data.stream.startedAt,
            });
          }
        }

        // Fetch recent stream stats
        fetchRecentStats();
      } else {
        // Redirect fans to their dashboard
        router.push('/dashboard');
        return;
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

      // Set video dimensions based on orientation
      // Use lower resolution on mobile for wider field of view (less zoom)
      // iPhone cameras crop/zoom at high resolutions
      const videoConstraints = orientation === 'portrait'
        ? {
            deviceId: selectedVideoDevice,
            width: { ideal: isMobile ? 720 : 1080 },
            height: { ideal: isMobile ? 1280 : 1920 },
            frameRate: { ideal: 30 },
            // Prevent camera from cropping to achieve resolution
            resizeMode: 'none' as const,
          }
        : {
            deviceId: selectedVideoDevice,
            width: { ideal: isMobile ? 1280 : 1920 },
            height: { ideal: isMobile ? 720 : 1080 },
            frameRate: { ideal: 30 },
            resizeMode: 'none' as const,
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: {
          deviceId: selectedAudioDevice,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
    setShowParticles(true);

    try {
      const response = await fetch('/api/streams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          tags: tags.length > 0 ? tags : undefined,
          privacy,
          orientation,
          featuredCreatorCommission,
          goPrivateEnabled,
          goPrivateRate: goPrivateRate || undefined,
          goPrivateMinDuration: goPrivateMinDuration || undefined,
          aiChatModEnabled: hasAiTwin ? aiChatModEnabled : undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const streamId = result.data.id;

        // Add featured creators to the stream (don't wait, fire and forget)
        if (featuredCreators.length > 0) {
          featuredCreators.forEach((creator, index) => {
            fetch(`/api/streams/${streamId}/featured`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creatorId: creator.id,
                lineupOrder: index + 1,
              }),
            }).catch(err => console.error('Error adding featured creator:', err));
          });
        }

        // Show success animation
        setShowSuccess(true);

        // Stop preview stream before redirecting
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
        }

        // Redirect after animation
        setTimeout(() => {
          router.push(`/stream/live/${streamId}`);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-purple-500/30 p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.2)]">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-2xl font-bold text-white mb-4">Creator Access Required</h1>
          <p className="text-gray-300 mb-6">
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

  // Show rejoin option if creator has an active stream
  if (activeStream) {
    const streamDuration = activeStream.startedAt
      ? Math.floor((Date.now() - new Date(activeStream.startedAt).getTime()) / 60000)
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4 md:pl-20">
        <div className="max-w-md w-full backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-red-500/50 p-8 text-center shadow-[0_0_40px_rgba(239,68,68,0.3)]">
          {/* Pulsing Live Indicator */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-red-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                LIVE NOW
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Your Stream is Still Live!</h1>
          <p className="text-xl text-cyan-400 font-semibold mb-4">"{activeStream.title}"</p>

          {/* Stream Stats */}
          <div className="flex justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{activeStream.currentViewers}</div>
              <div className="text-sm text-gray-400">Viewers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{streamDuration}</div>
              <div className="text-sm text-gray-400">Minutes</div>
            </div>
          </div>

          <p className="text-gray-300 mb-8">
            Your stream is still active. Rejoin to continue streaming or end it to start a new one.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <GlassButton
              variant="gradient"
              size="lg"
              onClick={() => router.push(`/stream/live/${activeStream.id}`)}
              className="w-full"
              shimmer
              glow
            >
              <span className="mr-2">🔴</span>
              Rejoin Stream
            </GlassButton>

            <button
              onClick={async () => {
                if (!confirm('Are you sure you want to end this stream? This cannot be undone.')) return;
                try {
                  const res = await fetch(`/api/streams/${activeStream.id}/end`, { method: 'POST' });
                  if (res.ok) {
                    setActiveStream(null);
                  } else {
                    showError('Failed to end stream');
                  }
                } catch (e) {
                  showError('Failed to end stream');
                }
              }}
              className="w-full py-3 px-6 bg-white/5 border border-white/20 rounded-xl text-gray-300 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all"
            >
              End Stream & Start New
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 md:pl-20">
      <ParticleEffect trigger={showParticles} />
      <SuccessAnimation show={showSuccess} />

      {/* Mobile Logo Header - extends to top edge with safe area padding */}
      <div
        className="md:hidden flex items-end justify-center pb-3 border-b border-white/10 bg-gradient-to-br from-gray-900 via-black to-gray-900"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(48px + env(safe-area-inset-top, 0px))' }}
      >
        <img
          src="/images/digis-logo-white.png"
          alt="Digis"
          className="h-8"
        />
      </div>

      <div className="container mx-auto px-4 pt-4 md:pt-10 pb-32 md:pb-10">
        {/* Stats */}
        {recentStats.totalStreams > 0 && (
          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm mb-8">
            <div className="backdrop-blur-xl bg-white/5 rounded-lg px-4 py-2 border border-cyan-500/30">
              <span className="text-gray-300">Avg Viewers:</span>
              <span className="ml-2 font-bold text-cyan-400">{recentStats.avgViewers}</span>
            </div>
            <div className="backdrop-blur-xl bg-white/5 rounded-lg px-4 py-2 border border-purple-500/30">
              <span className="text-gray-300">Total Streams:</span>
              <span className="ml-2 font-bold text-purple-400">{recentStats.totalStreams}</span>
            </div>
          </div>
        )}

        {/* 2-Column Layout */}
        <form onSubmit={handleStartStream} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {/* Left Column: Form */}
            <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-cyan-500/30 p-6 md:p-8 space-y-4 hover:border-cyan-500/50 transition-all duration-300 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-white mb-2">
                  Title <span className="text-cyan-400">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your stream about?"
                  className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
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
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what to expect..."
                  className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 resize-none"
                  rows={2}
                  maxLength={500}
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {description.length}/500
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Category
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className={`w-full px-4 py-3 rounded-xl text-left transition-all duration-300 flex items-center justify-between ${
                      category
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                        : 'bg-white/5 border-2 border-white/10 hover:border-cyan-500/30'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {category ? (
                        <>
                          <span className="text-xl">{STREAM_CATEGORIES.find(c => c.id === category)?.icon}</span>
                          <span className="text-white font-medium">{STREAM_CATEGORIES.find(c => c.id === category)?.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">Select a category...</span>
                      )}
                    </span>
                    <svg
                      className={`w-5 h-5 text-cyan-400 transition-transform duration-200 ${showCategoryDropdown ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Tron-themed Dropdown */}
                  {showCategoryDropdown && (
                    <div className="absolute z-50 w-full mt-2 py-2 bg-gray-900/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.2)] max-h-64 overflow-y-auto">
                      {STREAM_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategory(cat.id);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-200 ${
                            category === cat.id
                              ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-2 border-cyan-400'
                              : 'text-gray-300 hover:bg-cyan-500/10 hover:text-white border-l-2 border-transparent'
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <span className="font-medium">{cat.name}</span>
                            <p className="text-xs text-gray-500">{cat.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Tags <span className="text-gray-500 font-normal">(up to 5)</span>
                </label>
                {/* Current tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-300"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter(t => t !== tag))}
                          className="ml-1 text-gray-400 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Tag input */}
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">#</span>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const newTag = tagInput.trim();
                        if (newTag && !tags.includes(newTag) && tags.length < 5) {
                          setTags([...tags, newTag]);
                          setTagInput('');
                        }
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                    className="w-full pl-8 pr-4 py-2 bg-white/5 border-2 border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-500/50 text-sm"
                    disabled={tags.length >= 5}
                    maxLength={20}
                  />
                </div>
                {/* Suggested tags */}
                {category && getSuggestedTags(category).length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Suggested:</p>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestedTags(category)
                        .filter(t => !tags.includes(t))
                        .slice(0, 5)
                        .map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (tags.length < 5) {
                                setTags([...tags, tag]);
                              }
                            }}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                          >
                            #{tag}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy Settings */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Privacy
                </label>
                <div className="flex gap-2">
                  {PRIVACY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPrivacy(option.value)}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        privacy === option.value
                          ? 'bg-cyan-500 text-black'
                          : 'bg-white/5 text-gray-300 border border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation - Only show on mobile where it auto-follows device rotation */}
              {isMobile && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Screen Orientation
                  </label>
                  <div className="p-4 rounded-xl border-2 border-cyan-500/50 bg-cyan-500/10">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl transition-transform duration-300 ${
                        orientation === 'portrait' ? '' : 'rotate-90'
                      }`}>
                        📱
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">
                          {orientation === 'portrait' ? 'Portrait Mode' : 'Landscape Mode'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Auto-follows your phone rotation
                        </div>
                      </div>
                      <div className="text-cyan-400 text-xs font-medium">
                        AUTO
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Go Private Settings */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Go Private Settings
                </label>
                <div className="p-4 rounded-xl border-2 border-green-500/30 bg-green-500/5 space-y-4">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-white font-medium">Enable Go Private</span>
                      <p className="text-xs text-gray-400">Allow viewers to request 1-on-1 video calls</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGoPrivateEnabled(!goPrivateEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        goPrivateEnabled ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        goPrivateEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Rate and Duration - Only show if enabled */}
                  {goPrivateEnabled && (
                    <>
                      <div className="border-t border-white/10 pt-4">
                        <label className="block text-sm text-gray-300 mb-2">
                          Rate per minute
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={goPrivateRate ?? ''}
                            onChange={(e) => setGoPrivateRate(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={defaultCallSettings ? `${defaultCallSettings.rate} (default)` : '50'}
                            min={1}
                            className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                          />
                          <span className="text-gray-400 text-sm">coins</span>
                        </div>
                        {defaultCallSettings && !goPrivateRate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Uses your default call rate of {defaultCallSettings.rate} coins/min
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-2">
                          Minimum duration
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={goPrivateMinDuration ?? ''}
                            onChange={(e) => setGoPrivateMinDuration(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={defaultCallSettings ? `${defaultCallSettings.minDuration} (default)` : '5'}
                            min={1}
                            max={60}
                            className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                          />
                          <span className="text-gray-400 text-sm">minutes</span>
                        </div>
                        {defaultCallSettings && !goPrivateMinDuration && (
                          <p className="text-xs text-gray-500 mt-1">
                            Uses your default minimum of {defaultCallSettings.minDuration} minutes
                          </p>
                        )}
                      </div>

                      {/* Preview */}
                      <div className="bg-black/30 rounded-lg p-3 mt-2">
                        <p className="text-xs text-gray-400">
                          Viewers will pay{' '}
                          <span className="text-green-400 font-semibold">
                            {goPrivateRate || defaultCallSettings?.rate || 50} coins/min
                          </span>
                          {' '}with a minimum of{' '}
                          <span className="text-green-400 font-semibold">
                            {goPrivateMinDuration || defaultCallSettings?.minDuration || 5} minutes
                          </span>
                          {' '}({(goPrivateRate || defaultCallSettings?.rate || 50) * (goPrivateMinDuration || defaultCallSettings?.minDuration || 5)} coins min)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              </div>

            {/* Right Column: Device Preview */}
            <div className="backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-2xl border-2 border-purple-500/30 p-6 md:p-8 space-y-4 hover:border-purple-500/50 transition-all duration-300 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
              {/* Video Preview */}
              {devicesLoading ? (
                <VideoPreviewSkeleton />
              ) : previewError ? (
                <div className="relative aspect-video bg-gradient-to-br from-red-500/10 to-pink-500/10 rounded-xl overflow-hidden border-2 border-red-500/30">
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-red-400 text-sm font-semibold">{previewError}</p>
                      <button
                        type="button"
                        onClick={initializeDevices}
                        className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`relative bg-black rounded-xl overflow-hidden border-2 border-purple-500/30 group mx-auto ${
                  orientation === 'portrait'
                    ? 'aspect-[9/16] max-w-[280px]'
                    : 'aspect-video w-full'
                }`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full transition-transform duration-300 -scale-x-100 ${
                      orientation === 'portrait' ? 'object-cover' : 'object-contain'
                    }`}
                  />
                  {/* Live indicator */}
                  <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    PREVIEW
                  </div>
                  {/* Orientation badge */}
                  <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-semibold">
                    {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    {isMobile && <span className="text-cyan-400 ml-1">(auto)</span>}
                  </div>
                </div>
              )}

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
                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
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
                    className="w-full px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
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
                  <div className="relative w-full h-4 bg-white/5 rounded-full overflow-hidden border-2 border-white/10">
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
                    <p className="text-xs text-gray-300 font-semibold">
                      {audioLevel > 5 ? '🟢 Microphone active' : '🔴 Speak to test mic'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round(audioLevel)}%
                    </p>
                  </div>
                </div>

                {/* AI Chat Moderator - Only show if creator has AI Twin set up */}
                {hasAiTwin && (
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      AI Chat Moderator
                    </label>
                    <div className="p-4 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-white font-medium">Enable AI Chat Mod</span>
                          <p className="text-xs text-gray-400">Your AI Twin will help moderate chat during your stream</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiChatModEnabled(!aiChatModEnabled)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            aiChatModEnabled ? 'bg-cyan-500' : 'bg-gray-600'
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            aiChatModEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>

                      {aiChatModEnabled && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="text-cyan-400">✓</span>
                            Greet new viewers
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="text-cyan-400">✓</span>
                            Answer questions
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="text-cyan-400">✓</span>
                            Thank gifters instantly
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Featured Creators */}
              <FeaturedCreatorSelector
                selectedCreators={featuredCreators}
                onCreatorsChange={setFeaturedCreators}
                maxCreators={30}
              />

              {/* Featured Creator Commission - Only show if featured creators are selected */}
              {featuredCreators.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Featured Creator Commission
                  </label>
                  <div className="p-4 rounded-xl border-2 border-pink-500/30 bg-pink-500/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-300">Your commission on tips to featured creators</span>
                      <span className="text-lg font-bold text-pink-400">{featuredCreatorCommission}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={featuredCreatorCommission}
                      onChange={(e) => setFeaturedCreatorCommission(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                    />
                    <p className="mt-3 text-sm text-gray-300">
                      When viewers tip a featured creator, you'll receive <span className="text-pink-400 font-bold">{featuredCreatorCommission}%</span> and they'll receive <span className="text-pink-400 font-bold">{100 - featuredCreatorCommission}%</span>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-4 max-w-7xl mx-auto animate-shake">
              <p className="text-red-600 text-sm text-center font-semibold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="max-w-7xl mx-auto">
            <GlassButton
              type="submit"
              variant="gradient"
              size="lg"
              disabled={!title.trim() || !mediaStream || isCreating}
              className="w-full relative overflow-hidden group"
              shimmer
              glow
            >
              {isCreating ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-white font-bold">Starting Stream...</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-white">Start Stream</span>
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
