'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { UserCircle, Users, Calendar, ShieldCheck, MessageCircle, Video, Ticket, Radio, Gift, Clock, Phone, Star, Sparkles, Image, Film, Mic } from 'lucide-react';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import ProfileLiveSection from '@/components/profile/ProfileLiveSection';

interface ProfileData {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    bio: string | null;
    role: string;
    isCreatorVerified: boolean;
    isOnline: boolean;
    followerCount: number;
    followingCount: number;
    createdAt: string;
  };
  followCounts: {
    followers: number;
    following: number;
  };
  isFollowing: boolean;
  callSettings?: {
    callRatePerMinute: number;
    minimumCallDuration: number;
    isAvailableForCalls: boolean;
    voiceCallRatePerMinute: number;
    minimumVoiceCallDuration: number;
    isAvailableForVoiceCalls: boolean;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<any>(null);

  // Content tabs
  const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'streams' | 'shows' | 'about'>('photos');
  const [streams, setStreams] = useState<any[]>([]);
  const [shows, setShows] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile?.user.id && profile.user.role === 'creator') {
      fetchContent();
      checkIfLive();
    }
  }, [profile?.user.id]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load profile');
      }

      setProfile(data);
      setIsFollowing(data.isFollowing);

      // Check subscription status if creator
      if (data.user.role === 'creator') {
        checkSubscription(data.user.id);
        fetchSubscriptionTier(data.user.id);
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

  const fetchContent = async () => {
    if (!profile?.user.id) return;

    setContentLoading(true);
    try {
      // Fetch streams and shows in parallel
      const [streamsRes, showsRes] = await Promise.all([
        fetch(`/api/streams/my-streams?userId=${profile.user.id}`),
        fetch(`/api/shows/creator?creatorId=${profile.user.id}`)
      ]);

      if (streamsRes.ok) {
        const streamsData = await streamsRes.json();
        // Sort by date, most recent first, only show ended streams
        const streamsList = streamsData.data?.streams || [];
        const endedStreams = streamsList
          .filter((s: any) => s.status === 'ended')
          .sort((a: any, b: any) => new Date(b.endedAt || b.startedAt).getTime() - new Date(a.endedAt || a.startedAt).getTime())
          .slice(0, 12); // Show last 12 streams
        setStreams(endedStreams);
      }

      if (showsRes.ok) {
        const showsData = await showsRes.json();
        // Only show upcoming and live shows
        const showsList = Array.isArray(showsData.data) ? showsData.data : [];
        const upcomingShows = showsList
          .filter((s: any) => ['scheduled', 'live'].includes(s.status))
          .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
        setShows(upcomingShows);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setContentLoading(false);
    }
  };

  const checkIfLive = async () => {
    if (!profile?.user.id) return;

    try {
      const response = await fetch('/api/streams/live');
      if (response.ok) {
        const data = await response.json();
        const streamsList = data.data?.streams || [];
        const liveStream = streamsList.find((s: any) => s.creatorId === profile.user.id);
        if (liveStream) {
          setIsLive(true);
          setLiveStreamId(liveStream.id);
        }
      }
    } catch (err) {
      console.error('Error checking live status:', err);
    }
  };

  const handleFollowToggle = async () => {
    if (followLoading || !profile) return;

    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/follow/${profile.user.id}`, {
        method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      // Update local state
      setIsFollowing(!isFollowing);

      // Update follower count
      if (profile) {
        setProfile({
          ...profile,
          followCounts: {
            ...profile.followCounts,
            followers: profile.followCounts.followers + (isFollowing ? -1 : 1),
          },
        });
      }
    } catch (err: any) {
      console.error('Follow error:', err);
      alert(err.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (subscribeLoading || !profile?.user.id) return;

    setSubscribeLoading(true);
    try {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: profile.user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubscribed(true);
      alert(data.message || 'Successfully subscribed!');
    } catch (err: any) {
      console.error('Subscribe error:', err);
      alert(err.message);
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;

    try {
      // Fetch conversations to see if one exists with this user
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();

      if (response.ok && data.data) {
        // Find conversation with this user
        const existingConversation = data.data.find((conv: any) =>
          conv.user1Id === profile.user.id || conv.user2Id === profile.user.id
        );

        if (existingConversation) {
          // Navigate to existing conversation
          router.push(`/messages/${existingConversation.id}`);
          return;
        }
      }

      // No existing conversation, go to messages page
      router.push('/messages');
    } catch (error) {
      console.error('Error checking conversations:', error);
      router.push('/messages');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-pastel-gradient flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'User does not exist'}</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-2 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Browse Creators
          </button>
        </GlassCard>
      </div>
    );
  }

  const { user, followCounts } = profile;

  return (
    <div className="min-h-screen bg-pastel-gradient pb-8 md:pl-20 -mt-4 md:mt-0 pt-4 md:pt-0">
      {/* Banner - Responsive height */}
      <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-digis-cyan/30 to-digis-pink/30">
        {user.bannerUrl ? (
          <img
            src={user.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-digis-cyan/20 via-purple-500/20 to-digis-pink/20" />
        )}
        {/* Gradient overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Profile Content - Mobile optimized */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Avatar and Header Section */}
        <div className="relative -mt-16 sm:-mt-20 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white object-cover shadow-2xl ring-2 ring-digis-cyan/30"
                />
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center shadow-2xl ring-2 ring-digis-cyan/30">
                  <UserCircle className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                </div>
              )}
              {/* Online indicator */}
              {user.isOnline && (
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg">
                  <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                </div>
              )}
            </div>

            {/* Name and Stats - Mobile stacked */}
            <div className="flex-1 min-w-0">
              {/* Name */}
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white md:text-gray-900 truncate drop-shadow-lg md:drop-shadow-none" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                  {user.displayName || user.username}
                </h1>
                {user.isCreatorVerified && (
                  <div className="relative flex-shrink-0">
                    <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 fill-blue-500" strokeWidth={2} />
                  </div>
                )}
              </div>
              {user.displayName && (
                <p className="text-white/90 md:text-gray-600 mb-3 drop-shadow-md md:drop-shadow-none">@{user.username}</p>
              )}

              {/* Stats - Responsive grid */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
                <button
                  onClick={() => setActiveTab('about')}
                  className="flex items-center gap-1.5 hover:text-digis-cyan transition-colors"
                >
                  <Users className="w-4 h-4 text-white/80 md:text-gray-500" />
                  <span>
                    <strong className="text-white md:text-gray-900">{followCounts.followers.toLocaleString()}</strong>{' '}
                    <span className="text-white/80 md:text-gray-600">Followers</span>
                  </span>
                </button>
                <span className="text-white/60 md:hidden">•</span>
                <span className="flex md:hidden items-center gap-1.5 text-white/80">
                  <Calendar className="w-4 h-4 text-white/70" />
                  Joined {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Mobile stacked, tablet+ row */}
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
            {/* Follow Button */}
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              title={isFollowing ? 'Following' : 'Follow'}
              className={`w-11 h-11 rounded-xl font-semibold transition-all flex items-center justify-center ${
                isFollowing
                  ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-2 border-gray-300'
                  : 'bg-gradient-to-r from-digis-cyan to-digis-pink text-white hover:scale-105 shadow-fun'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {followLoading ? <LoadingSpinner size="sm" /> : <Users className="w-5 h-5" />}
            </button>

            {/* Subscribe Button */}
            {user.role === 'creator' && subscriptionTier && !isSubscribed && (
              <button
                onClick={handleSubscribe}
                disabled={subscribeLoading}
                className="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-fun"
              >
                <Star className="w-4 h-4" />
                {subscribeLoading ? 'Subscribing...' : `Subscribe • ${subscriptionTier.pricePerMonth.toLocaleString()} coins/mo`}
              </button>
            )}

            {/* Subscribed Badge */}
            {user.role === 'creator' && isSubscribed && (
              <div className="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center gap-2">
                <Star className="w-4 h-4 fill-white" />
                Subscribed
              </div>
            )}

            {/* Message Button */}
            <button
              onClick={handleMessage}
              title="Message"
              className="w-11 h-11 rounded-xl font-semibold bg-white/80 hover:bg-white border-2 border-gray-300 hover:border-digis-cyan transition-all flex items-center justify-center text-gray-800"
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            {/* Video Call Button */}
            {user.role === 'creator' && profile.callSettings && (
              <RequestCallButton
                creatorId={user.id}
                creatorName={user.displayName || user.username}
                ratePerMinute={profile.callSettings.callRatePerMinute}
                minimumDuration={profile.callSettings.minimumCallDuration}
                isAvailable={profile.callSettings.isAvailableForCalls}
                iconOnly
                callType="video"
              />
            )}

            {/* Voice Call Button */}
            {user.role === 'creator' && profile.callSettings && (
              <RequestCallButton
                creatorId={user.id}
                creatorName={user.displayName || user.username}
                ratePerMinute={profile.callSettings.voiceCallRatePerMinute}
                minimumDuration={profile.callSettings.minimumVoiceCallDuration}
                isAvailable={profile.callSettings.isAvailableForVoiceCalls}
                iconOnly
                callType="voice"
              />
            )}
          </div>
        </div>

        {/* Inline Live Stream Section */}
        <ProfileLiveSection username={user.username} />

        {/* Currently Live Banner (fallback - will be hidden if ProfileLiveSection shows) */}
        {isLive && liveStreamId && (
          <div className="mb-6">
            <button
              onClick={() => router.push(`/stream/${liveStreamId}`)}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-2xl p-4 sm:p-6 transition-all hover:scale-[1.02] border-2 border-red-400 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative flex-shrink-0">
                    <Radio className="w-8 h-8 text-white" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <span className="inline-block px-2 py-1 bg-red-600 rounded text-sm font-bold">LIVE</span>
                      <span className="hidden sm:inline">{user.displayName || user.username} is streaming now!</span>
                      <span className="sm:hidden">Streaming Now!</span>
                    </h3>
                    <p className="text-white/90 text-sm mt-1">Tap to watch the live stream</p>
                  </div>
                </div>
                <Video className="w-6 h-6 text-white flex-shrink-0" />
              </div>
            </button>
          </div>
        )}

        {/* Content Tabs */}
        <div>
          <GlassCard className="overflow-hidden shadow-fun">
            {/* Tab Headers - Mobile optimized */}
            <div className="border-b border-purple-200 overflow-x-auto">
              <div className="flex min-w-max sm:min-w-0">
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'photos'
                      ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Image className="w-4 h-4" />
                    Photos
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'video'
                      ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Film className="w-4 h-4" />
                    Video
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('streams')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'streams'
                      ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Streams</span>
                    <span className="sm:hidden">Live</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('shows')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'shows'
                      ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Shows
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 font-semibold transition-colors whitespace-nowrap ${
                    activeTab === 'about'
                      ? 'text-digis-cyan border-b-2 border-digis-cyan bg-digis-cyan/10'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/40'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <UserCircle className="w-4 h-4" />
                    About
                  </div>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
              {contentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <>
                  {/* Photos Tab */}
                  {activeTab === 'photos' && (
                    <div className="text-center py-12">
                      <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No photos yet</h3>
                      <p className="text-gray-600 px-4">
                        Check back later for photo uploads
                      </p>
                    </div>
                  )}

                  {/* Video Tab */}
                  {activeTab === 'video' && (
                    <div className="text-center py-12">
                      <Film className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No videos yet</h3>
                      <p className="text-gray-600 px-4">
                        Check back later for video content
                      </p>
                    </div>
                  )}

                  {/* Streams Tab */}
                  {activeTab === 'streams' && (
                    <div>
                      {streams.length === 0 ? (
                        <div className="text-center py-12">
                          <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No past streams yet</h3>
                          <p className="text-gray-600 mb-4 px-4">
                            {isFollowing
                              ? "You'll be notified when they go live"
                              : 'Follow to get notified when they go live'}
                          </p>
                          {!isFollowing && (
                            <button
                              onClick={handleFollowToggle}
                              className="px-6 py-2.5 bg-gradient-to-r from-digis-cyan to-digis-pink text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-fun"
                            >
                              Follow {user.displayName || user.username}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {streams.map((stream: any) => (
                            <button
                              key={stream.id}
                              onClick={() => router.push(`/stream/${stream.id}`)}
                              className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-cyan-200 hover:border-digis-cyan transition-all shadow-fun hover:shadow-2xl hover:scale-105"
                            >
                              {/* Thumbnail placeholder */}
                              <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/20 to-digis-pink/20 flex items-center justify-center">
                                <Video className="w-12 h-12 text-gray-600 group-hover:scale-110 transition-transform" />
                              </div>

                              {/* Stream info overlay */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent p-3 sm:p-4">
                                <h4 className="text-white font-semibold text-sm sm:text-base line-clamp-1 mb-1">
                                  {stream.title}
                                </h4>
                                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-300">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {stream.peakViewers || 0}
                                  </span>
                                  <span>
                                    {new Date(stream.endedAt || stream.startedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Shows Tab */}
                  {activeTab === 'shows' && (
                    <div>
                      {shows.length === 0 ? (
                        <div className="text-center py-12">
                          <Ticket className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No upcoming shows</h3>
                          <p className="text-gray-600 px-4">
                            Check back later for ticketed events and special shows
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {shows.map((show: any) => (
                            <button
                              key={show.id}
                              onClick={() => router.push(`/shows/${show.id}`)}
                              className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 bg-white/60 hover:bg-white/80 rounded-xl border-2 border-purple-200 hover:border-purple-500 transition-all text-left shadow-fun hover:shadow-lg"
                            >
                              {/* Show thumbnail */}
                              <div className="w-full sm:w-28 sm:h-28 aspect-square sm:aspect-auto flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border-2 border-purple-500/30 relative overflow-hidden">
                                {show.coverImageUrl ? (
                                  <img src={show.coverImageUrl} alt={show.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Ticket className="w-10 h-10 sm:w-12 sm:h-12 text-purple-400" />
                                )}
                                {show.status === 'live' && (
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                    LIVE
                                  </div>
                                )}
                              </div>

                              {/* Show details */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-2 mb-1">{show.title}</h3>
                                {show.description && (
                                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{show.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                  <span className="flex items-center gap-1 text-gray-600">
                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    {new Date(show.scheduledStart).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-yellow-600 font-bold">
                                    {show.ticketPrice?.toLocaleString()} coins
                                  </span>
                                  {show.ticketsSold !== undefined && show.maxTickets && (
                                    <span className="text-gray-600">
                                      {show.ticketsSold}/{show.maxTickets} sold
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* About Tab */}
                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-digis-cyan" />
                          About
                        </h3>
                        {user.bio ? (
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
                        ) : (
                          <p className="text-gray-500 italic">No bio yet</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Stats</h3>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                              {followCounts.followers.toLocaleString()}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Followers</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-xl border-2 border-cyan-200 hover:border-cyan-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                              {streams.length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Past Streams</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-xl border-2 border-pink-200 hover:border-pink-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                              {shows.length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Upcoming Shows</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-colors">
                            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                              {new Date(user.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">Joined</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
