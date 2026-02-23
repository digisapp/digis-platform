'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { FeaturedCreator, ActiveStream } from '@/components/go-live/types';
import { isMobileDevice } from '@/components/go-live/types';

export type StreamMethod = 'browser' | 'rtmp';

export interface DeviceInfo {
  mediaStream: MediaStream | null;
  selectedVideoDevice: string;
  selectedAudioDevice: string;
  stopAllTracks: () => void;
}

export interface RtmpIngressInfo {
  url: string;
  streamKey: string;
  streamId: string;
}

export function useGoLiveData() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [streamMethod, setStreamMethod] = useState<StreamMethod>('browser');

  // RTMP ingress info (after stream creation in RTMP mode)
  const [rtmpInfo, setRtmpInfo] = useState<RtmpIngressInfo | null>(null);

  // Creator state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentStats, setRecentStats] = useState({ avgViewers: 0, totalStreams: 0 });
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Featured creators
  const [featuredCreators, setFeaturedCreators] = useState<FeaturedCreator[]>([]);
  const [featuredCreatorCommission, setFeaturedCreatorCommission] = useState(20);

  // Go Private settings
  const [goPrivateEnabled, setGoPrivateEnabled] = useState(true);
  const [goPrivateRate, setGoPrivateRate] = useState<number | null>(null);
  const [goPrivateMinDuration, setGoPrivateMinDuration] = useState<number | null>(null);
  const [defaultCallSettings, setDefaultCallSettings] = useState<{ rate: number; minDuration: number } | null>(null);

  // AI Chat Moderator
  const [aiChatModEnabled, setAiChatModEnabled] = useState(false);
  const [hasAiTwin, setHasAiTwin] = useState(false);

  // Animation / UI state
  const [showParticles, setShowParticles] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showStreamingTipsModal, setShowStreamingTipsModal] = useState(false);

  // Track actual device orientation
  const [deviceOrientation, setDeviceOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Detect actual device orientation
  useEffect(() => {
    const updateDeviceOrientation = () => {
      if (typeof window !== 'undefined') {
        if (screen.orientation) {
          const isPortrait = screen.orientation.type.includes('portrait');
          setDeviceOrientation(isPortrait ? 'portrait' : 'landscape');
        } else {
          setDeviceOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
        }
      }
    };

    updateDeviceOrientation();

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

  // Init mobile detection and set default orientation
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    setOrientation(mobile ? 'portrait' : 'landscape');
  }, []);

  const checkCreatorStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const [profileRes, activeRes, callSettingsRes, aiSettingsRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/streams/active'),
        fetch('/api/user/call-settings'),
        fetch('/api/ai/settings')
      ]);

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

        if (callSettingsRes.ok) {
          const callData = await callSettingsRes.json();
          if (callData.settings) {
            setDefaultCallSettings({
              rate: callData.settings.callRatePerMinute || 50,
              minDuration: callData.settings.minimumCallDuration || 5,
            });
          }
        }

        if (aiSettingsRes.ok) {
          const aiData = await aiSettingsRes.json();
          if (aiData.settings) {
            const isConfigured = aiData.settings.enabled ||
                                 aiData.settings.textChatEnabled ||
                                 aiData.settings.personalityPrompt;
            setHasAiTwin(!!isConfigured);
            setAiChatModEnabled(aiData.settings.streamChatModEnabled || false);
          }
        }

        if (activeRes.ok) {
          const activeData = await activeRes.json();
          if (activeData.data?.hasActiveStream && activeData.data?.stream) {
            setActiveStream({
              id: activeData.data.stream.id,
              title: activeData.data.stream.title || 'Your Stream',
              currentViewers: activeData.data.stream.currentViewers || 0,
              startedAt: activeData.data.stream.startedAt,
            });
          }
        }

        fetchRecentStats();
      } else {
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

  const handleStartStream = async (e: React.FormEvent, deviceInfo: DeviceInfo) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter a stream title');
      return;
    }

    // Only require camera for browser mode
    if (streamMethod === 'browser' && !deviceInfo.mediaStream) {
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
          category: category || undefined,
          tags: tags.length > 0 ? tags : undefined,
          privacy,
          orientation,
          featuredCreatorCommission,
          goPrivateEnabled,
          goPrivateRate: goPrivateRate || undefined,
          goPrivateMinDuration: goPrivateMinDuration || undefined,
          aiChatModEnabled: hasAiTwin ? aiChatModEnabled : undefined,
          streamMethod,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const streamId = result.data.id;

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

        // For RTMP mode: create ingress and show OBS setup
        if (streamMethod === 'rtmp') {
          try {
            const ingressRes = await fetch(`/api/streams/${streamId}/ingress`, {
              method: 'POST',
            });
            const ingressResult = await ingressRes.json();

            if (ingressRes.ok && ingressResult.data) {
              setRtmpInfo({
                url: ingressResult.data.url,
                streamKey: ingressResult.data.streamKey,
                streamId,
              });
              setShowSuccess(true);
              deviceInfo.stopAllTracks();
              // Don't navigate yet — show OBS setup component
            } else {
              setError(ingressResult.error || 'Failed to create RTMP ingress');
              setShowParticles(false);
            }
          } catch {
            setError('Failed to create RTMP ingress. Please try again.');
            setShowParticles(false);
          }
        } else {
          // Browser mode: navigate to broadcaster page
          setShowSuccess(true);
          deviceInfo.stopAllTracks();

          setTimeout(() => {
            const params = new URLSearchParams();
            if (deviceInfo.selectedVideoDevice) params.set('video', deviceInfo.selectedVideoDevice);
            if (deviceInfo.selectedAudioDevice) params.set('audio', deviceInfo.selectedAudioDevice);
            const queryString = params.toString();
            router.push(`/stream/live/${streamId}${queryString ? `?${queryString}` : ''}`);
          }, 800);
        }
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

  return {
    // Form
    title, setTitle,
    category, setCategory,
    showCategoryDropdown, setShowCategoryDropdown,
    tags, setTags,
    tagInput, setTagInput,
    privacy, setPrivacy,
    orientation, setOrientation,
    streamMethod, setStreamMethod,
    rtmpInfo,
    // Creator
    isCreating, error, isCreator, loading,
    recentStats, activeStream, setActiveStream,
    isMobile, deviceOrientation,
    // Featured creators
    featuredCreators, setFeaturedCreators,
    featuredCreatorCommission, setFeaturedCreatorCommission,
    // Go Private
    goPrivateEnabled, setGoPrivateEnabled,
    goPrivateRate, setGoPrivateRate,
    goPrivateMinDuration, setGoPrivateMinDuration,
    defaultCallSettings,
    // AI
    aiChatModEnabled, setAiChatModEnabled,
    hasAiTwin,
    // Animation / UI
    showParticles, showSuccess,
    showStreamingTipsModal, setShowStreamingTipsModal,
    // Actions
    checkCreatorStatus,
    handleStartStream,
  };
}
