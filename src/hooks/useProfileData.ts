'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ProfileData, ContentItem, StreamItem, ClipItem } from '@/components/profile/types';

function transformContentItem(item: any): ContentItem {
  return {
    id: item.id,
    type: item.contentType === 'video' ? 'video' : 'photo',
    title: item.title,
    thumbnail: item.thumbnailUrl,
    url: item.mediaUrl,
    description: item.description,
    likes: item.likeCount || 0,
    isLiked: item.isLiked || false,
    views: item.viewCount,
    isLocked: !item.isFree && !item.hasPurchased,
    unlockPrice: item.unlockPrice,
    isFree: item.isFree,
    timestamp: new Date(item.createdAt).toLocaleDateString(),
    featured: false,
  };
}

function transformVod(vod: any): StreamItem {
  return {
    id: vod.id,
    title: vod.title,
    description: vod.description,
    thumbnailUrl: vod.thumbnailUrl,
    peakViewers: vod.originalPeakViewers,
    totalViews: vod.viewCount,
    endedAt: vod.createdAt,
    startedAt: vod.createdAt,
    duration: vod.duration,
    priceCoins: vod.priceCoins,
    isPublic: vod.isPublic,
    isVod: true,
    isTicketed: false,
    isLocked: vod.isLocked || false,
    hasAccess: vod.hasAccess !== false,
    recordingType: vod.recordingType || 'auto',
    sortDate: new Date(vod.createdAt),
  };
}

export function useProfileData({ username }: { username: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Content tabs
  const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'streams' | 'about'>('photos');
  const [streamsSubTab, setStreamsSubTab] = useState<'vods' | 'clips'>('vods');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [hasMoreStreams, setHasMoreStreams] = useState(false);
  const [loadingMoreStreams, setLoadingMoreStreams] = useState(false);
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [hasMoreContent, setHasMoreContent] = useState(false);
  const [loadingMoreContent, setLoadingMoreContent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aiTwinEnabled, setAiTwinEnabled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    Promise.all([
      fetchProfile(),
      checkAuth(),
      checkIfLive(),
    ]);
  }, [username]);

  useEffect(() => {
    if (profile?.user.id && profile.user.role === 'creator') {
      fetchContent();

      const liveCheckInterval = setInterval(() => {
        checkIfLive();
      }, 30000);

      return () => clearInterval(liveCheckInterval);
    }
  }, [profile?.user.id]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    setCurrentUserId(user?.id || null);
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load profile');
      }

      setProfile(data);
      setIsFollowing(data.isFollowing);

      if (data.goals) setGoals(data.goals);
      if (data.content) {
        const bentaContent = data.content.map(transformContentItem);
        setContent(bentaContent);
        setHasMoreContent(data.hasMoreContent || false);
      }

      if (data.user.role === 'creator') {
        Promise.all([
          checkSubscription(data.user.id),
          fetchSubscriptionTier(data.user.id),
          checkAiTwin(data.user.id)
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async (creatorId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/check?creatorId=${creatorId}`);
      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.isSubscribed);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const fetchSubscriptionTier = async (creatorId: string) => {
    try {
      const response = await fetch(`/api/subscriptions/tier/${creatorId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.tier && data.tier.isActive) {
          setSubscriptionTier(data.tier);
        }
      }
    } catch (err) {
      console.error('Error fetching subscription tier:', err);
    }
  };

  const checkAiTwin = async (creatorId: string) => {
    try {
      const response = await fetch(`/api/ai/check/${creatorId}`);
      if (response.ok) {
        const data = await response.json();
        setAiTwinEnabled(data.enabled);
      }
    } catch (err) {
      console.error('Error checking AI Twin:', err);
    }
  };

  const fetchContent = async () => {
    if (!profile?.user.id) return;

    setContentLoading(true);
    try {
      const [vodsRes, showsRes, clipsRes] = await Promise.all([
        fetch(`/api/vods/my-vods?userId=${profile.user.id}&limit=12`),
        fetch(`/api/shows/creator?creatorId=${profile.user.id}`),
        fetch(`/api/clips?creatorId=${profile.user.id}`)
      ]);

      const allStreamContent: StreamItem[] = [];

      if (vodsRes.ok) {
        const vodsData = await vodsRes.json();
        const vodsList = vodsData.vods || [];
        setHasMoreStreams(vodsData.hasMore || false);
        const savedStreams = vodsList.map(transformVod);
        allStreamContent.push(...savedStreams);
      }

      if (showsRes.ok) {
        const showsData = await showsRes.json();
        const showsList = Array.isArray(showsData.data) ? showsData.data : [];
        const now = new Date();
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        const upcomingShows = showsList
          .filter((s: any) => {
            if (s.status === 'live') return true;
            if (s.status === 'scheduled') {
              const scheduledTime = new Date(s.scheduledStart);
              return scheduledTime > fourHoursAgo;
            }
            return false;
          })
          .map((show: any): StreamItem => ({
            id: show.id,
            title: show.title,
            description: show.description,
            thumbnailUrl: show.coverImageUrl,
            ticketPrice: show.ticketPrice,
            ticketsSold: show.ticketsSold,
            maxTickets: show.maxTickets,
            scheduledStart: show.scheduledStart,
            status: show.status,
            showType: show.showType,
            isVod: false,
            isTicketed: true,
            sortDate: new Date(show.scheduledStart),
          }));
        allStreamContent.push(...upcomingShows);
      }

      allStreamContent.sort((a, b) => {
        if (a.isTicketed && !b.isTicketed) return -1;
        if (!a.isTicketed && b.isTicketed) return 1;
        if (a.isTicketed && b.isTicketed) {
          return a.sortDate.getTime() - b.sortDate.getTime();
        }
        return b.sortDate.getTime() - a.sortDate.getTime();
      });

      setStreams(allStreamContent);

      if (clipsRes.ok) {
        const clipsData = await clipsRes.json();
        setClips(clipsData.clips || []);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setContentLoading(false);
    }
  };

  const checkIfLive = async () => {
    try {
      const response = await fetch(`/api/streams/live?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        const streamsList = data.data?.streams || [];
        const liveStream = streamsList.find((s: any) =>
          s.creatorUsername?.toLowerCase() === username.toLowerCase() ||
          (profile?.user.id && s.creatorId === profile.user.id)
        );
        if (liveStream) {
          setIsLive(true);
          setLiveStreamId(liveStream.id);
        } else {
          setIsLive(false);
          setLiveStreamId(null);
        }
      }
    } catch (err) {
      console.error('Error checking live status:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch(`/api/profile/${username}/goals`);
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  };

  const fetchCreatorContent = async () => {
    try {
      const response = await fetch(`/api/profile/${username}/content`);
      if (response.ok) {
        const data = await response.json();
        const bentaContent = data.content.map(transformContentItem);
        setContent(bentaContent);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    }
  };

  const loadMoreContent = async (type?: 'photo' | 'video') => {
    if (!profile?.user.username || loadingMoreContent) return;

    setLoadingMoreContent(true);
    try {
      const currentCount = type
        ? content.filter(c => c.type === type).length
        : content.length;

      const params = new URLSearchParams({
        limit: '12',
        offset: currentCount.toString(),
      });
      if (type) params.set('type', type);

      const response = await fetch(`/api/profile/${profile.user.username}/content?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.content && data.content.length > 0) {
          const newContent = data.content.map(transformContentItem);
          setContent(prev => [...prev, ...newContent]);
          setHasMoreContent(data.hasMore);
        } else {
          setHasMoreContent(false);
        }
      }
    } catch (error) {
      console.error('Error loading more content:', error);
    } finally {
      setLoadingMoreContent(false);
    }
  };

  const loadMoreVods = async () => {
    if (!profile?.user.id || loadingMoreStreams) return;

    setLoadingMoreStreams(true);
    try {
      const currentVodCount = streams.filter(s => s.isVod).length;
      const response = await fetch(
        `/api/vods/my-vods?userId=${profile.user.id}&limit=12&offset=${currentVodCount}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.vods && data.vods.length > 0) {
          const newVods = data.vods.map(transformVod);
          setStreams(prev => [...prev, ...newVods]);
          setHasMoreStreams(data.hasMore || false);
        } else {
          setHasMoreStreams(false);
        }
      }
    } catch (error) {
      console.error('Error loading more VODs:', error);
    } finally {
      setLoadingMoreStreams(false);
    }
  };

  return {
    profile,
    setProfile,
    loading,
    error,
    isAuthenticated,
    currentUserId,
    isFollowing,
    setIsFollowing,
    isSubscribed,
    setIsSubscribed,
    subscriptionTier,
    activeTab,
    setActiveTab,
    streamsSubTab,
    setStreamsSubTab,
    content,
    setContent,
    streams,
    clips,
    contentLoading,
    hasMoreContent,
    hasMoreStreams,
    loadingMoreContent,
    loadingMoreStreams,
    isLive,
    liveStreamId,
    goals,
    aiTwinEnabled,
    mounted,
    fetchGoals,
    fetchCreatorContent,
    loadMoreContent,
    loadMoreVods,
  };
}
