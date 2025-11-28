'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { UserCircle, Users, Calendar, ShieldCheck, MessageCircle, Video, Ticket, Radio, Gift, Clock, Phone, Star, Sparkles, Image, Film, Mic, CheckCircle, Lock, Play } from 'lucide-react';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import ProfileLiveSection from '@/components/profile/ProfileLiveSection';
import { TipModal } from '@/components/messages/TipModal';
import { ParallaxBanner } from '@/components/profile/ParallaxBanner';
import { AnimatedAvatar } from '@/components/profile/AnimatedAvatar';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { ProfileGoalsWidget } from '@/components/profile/ProfileGoalsWidget';
import { MobileHeader } from '@/components/layout/MobileHeader';

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
  const [showTipModal, setShowTipModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchProfile();
    checkAuth();
  }, [username]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
  };

  useEffect(() => {
    if (profile?.user.id && profile.user.role === 'creator') {
      fetchContent();
      checkIfLive();
      fetchGoals();
      fetchCreatorContent();
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
        // Transform content to bento grid format
        const bentaContent = data.content.map((item: any) => ({
          id: item.id,
          type: item.contentType === 'video' ? 'video' : item.contentType === 'photo' ? 'photo' : 'photo',
          title: item.title,
          thumbnail: item.thumbnailUrl,
          url: item.mediaUrl,
          description: item.description,
          likes: 0, // TODO: Add likes functionality
          views: item.viewCount,
          isLocked: !item.isFree,
          unlockPrice: item.unlockPrice,
          isFree: item.isFree,
          timestamp: new Date(item.createdAt).toLocaleDateString(),
          featured: false,
        }));
        setContent(bentaContent);
      }
    } catch (err) {
      console.error('Error fetching content:', err);
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

      // Show confetti on follow
      if (!isFollowing) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

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
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
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
      // Check if user is authenticated
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // User not authenticated, show login prompt
        alert('Please sign in to send messages');
        router.push('/');
        return;
      }

      // Check if user is trying to message themselves
      const currentUserResponse = await fetch('/api/user/profile');
      let currentUserData: any = null;

      if (currentUserResponse.ok) {
        currentUserData = await currentUserResponse.json();
        if (currentUserData.user?.id === profile.user.id) {
          alert("You can't message yourself");
          return;
        }
      }

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
          router.push(`/chats/${existingConversation.id}`);
          return;
        }
      }

      // No existing conversation - check if cold outreach fee applies
      // If current user is a creator messaging a fan without a relationship, they'll be charged 50 coins
      const currentUser = currentUserData?.user;
      const isCreatorMessagingFan = currentUser?.role === 'creator' && profile.user.role !== 'creator';

      if (isCreatorMessagingFan) {
        // Show confirmation for cold outreach fee
        const confirmed = confirm(
          `Message Unlock: 50 coins\n\n` +
          `You'll be charged 50 coins to send your first message to ${profile.user.displayName || profile.user.username}.\n\n` +
          `After that, messaging is free!\n\n` +
          `Note: Free if they've tipped, subscribed, or messaged you first.`
        );

        if (!confirmed) {
          return; // User cancelled
        }
      }

      // Create conversation by sending initial message
      const createResponse = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: profile.user.id,
          content: '👋', // Send a friendly wave emoji to start the conversation
        }),
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        // Navigate to the newly created conversation
        router.push(`/chats/${createData.conversationId}`);
      } else {
        const errorData = await createResponse.json();
        alert(errorData.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const handleSendTip = async (amount: number, message: string) => {
    if (!profile) return;

    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receiverId: profile.user.id,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send tip');
      }

      // Success! The modal will close automatically
      alert(`✨ Successfully sent ${amount} coins to ${profile.user.displayName || profile.user.username}!`);
    } catch (error) {
      throw error; // Re-throw to let the modal handle it
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-400 mb-4">{error || 'User does not exist'}</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Browse Creators
          </button>
        </GlassCard>
      </div>
    );
  }

  const { user, followCounts } = profile;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-24 md:pb-8 ${isAuthenticated ? 'md:pl-20' : ''} -mt-4 md:mt-0 pt-4 md:pt-0 relative overflow-hidden`}>
      {/* Mobile Header with Logo and Wallet */}
      <MobileHeader />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden h-16" />

      {/* Animated Background Mesh - Tron Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Confetti Effect */}
      <ConfettiEffect show={showConfetti} duration={2000} />

      {/* Banner with Parallax Effect */}
      <div className="relative">
        <ParallaxBanner imageUrl={user.bannerUrl} height={user.bannerUrl ? "h-48 sm:h-56 md:h-64" : "h-32 sm:h-40 md:h-48"} />
        {/* Gradient Overlay for better contrast - Tron Theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90"></div>
      </div>

      {/* Profile Content - Mobile optimized */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Avatar and Header Section - Modern Glass Card */}
        <div className="relative -mt-24 sm:-mt-28 mb-8">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              {/* Animated Avatar with Neon Glow */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-digis-cyan via-digis-purple to-digis-pink rounded-full blur-lg group-hover:blur-xl transition-all opacity-75 group-hover:opacity-100"></div>
                <div className="relative">
                  <AnimatedAvatar
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    size="large"
                    isOnline={user.isOnline}
                  />
                </div>
              </div>

              {/* Name and Bio Section */}
              <div className="flex-1 min-w-0">
                {/* Name with Verification Badge */}
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl sm:text-4xl font-black text-white truncate bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                    {user.displayName || user.username}
                  </h1>
                  {user.isCreatorVerified && (
                    <div className="relative flex-shrink-0 group" title="Verified Creator">
                      <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-75 group-hover:opacity-100"></div>
                      <CheckCircle className="relative w-7 h-7 text-white fill-blue-500" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {user.displayName && (
                  <p className="text-cyan-300/90 mb-2 text-lg">@{user.username}</p>
                )}

                {/* Follower Count - Display only */}
                <div className="mb-4 text-sm font-medium flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>
                    <strong className="text-white">{followCounts.followers.toLocaleString()}</strong> Follower{followCounts.followers !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Bio */}
                {user.bio && (
                  <p className="text-gray-300 mb-6 text-sm sm:text-base leading-relaxed line-clamp-3">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

          {/* Action Buttons - Futuristic Design */}
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Follow Button - Primary CTA */}
            <button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`group relative overflow-hidden min-h-[48px] px-6 py-3 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 ${
                isFollowing
                  ? 'bg-white/10 backdrop-blur-md border-2 border-cyan-500/50 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-500/10'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50 hover:scale-105 hover:shadow-cyan-500/70'
              }`}
            >
              {!isFollowing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12"></div>
              )}
              <Users className={`w-5 h-5 relative z-10 ${isFollowing ? 'fill-cyan-400' : ''}`} />
              <span className="relative z-10">{followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            {/* Subscribe Button */}
            {user.role === 'creator' && subscriptionTier && !isSubscribed && (
              <button
                onClick={handleSubscribe}
                disabled={subscribeLoading}
                className="group relative overflow-hidden min-h-[48px] px-6 py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white hover:scale-105 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12"></div>
                <Star className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{subscribeLoading ? 'Subscribing...' : `Subscribe • ${subscriptionTier.pricePerMonth.toLocaleString()} coins/mo`}</span>
              </button>
            )}

            {/* Subscribed Badge */}
            {user.role === 'creator' && isSubscribed && (
              <div className="relative overflow-hidden min-h-[48px] px-6 py-3 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-500/50">
                <Star className="w-5 h-5 fill-white" />
                Subscribed
              </div>
            )}

            {/* Message Button */}
            <button
              onClick={handleMessage}
              className="group relative overflow-hidden min-h-[48px] px-5 py-3 rounded-2xl font-bold bg-white/10 backdrop-blur-md border border-white/20 hover:border-digis-cyan/50 transition-all hover:scale-105 flex items-center justify-center gap-2 text-white shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-digis-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageCircle className="w-5 h-5 relative z-10" />
              <span className="hidden md:inline relative z-10">Message</span>
            </button>

            {/* Video Call Button */}
            {user.role === 'creator' && profile.callSettings && (
              <RequestCallButton
                creatorId={user.id}
                creatorName={user.displayName || user.username}
                ratePerMinute={profile.callSettings.callRatePerMinute}
                minimumDuration={profile.callSettings.minimumCallDuration}
                isAvailable={profile.callSettings.isAvailableForCalls}
                iconOnly={false}
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
                iconOnly={false}
                callType="voice"
              />
            )}

            {/* Tip Button - Last */}
            {user.role === 'creator' && (
              <button
                onClick={() => setShowTipModal(true)}
                className="group relative overflow-hidden min-h-[48px] px-5 py-3 rounded-2xl font-bold bg-white/10 backdrop-blur-md border border-white/20 hover:border-yellow-500/50 transition-all hover:scale-105 flex items-center justify-center gap-2 text-white shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Gift className="w-5 h-5 relative z-10" />
                <span className="hidden md:inline relative z-10">Tip</span>
              </button>
            )}
          </div>
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

        {/* Profile Goals Widget */}
        {user.role === 'creator' && goals.length > 0 && (
          <div className="mb-6">
            <ProfileGoalsWidget goals={goals} maxDisplay={3} onGoalUpdate={fetchGoals} />
          </div>
        )}

        {/* Content Tabs - Futuristic Design */}
        <div className="overflow-hidden mb-8">
          {/* Tab Pills - Glassmorphism */}
          <div className="mb-6 flex flex-wrap gap-3 overflow-x-auto pb-2 pl-4 pr-1">
            <button
              onClick={() => setActiveTab('photos')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'photos'
                  ? 'bg-gradient-to-r from-digis-cyan to-blue-500 text-white shadow-lg shadow-cyan-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-digis-cyan/50 hover:scale-105'
              }`}
            >
              {activeTab === 'photos' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <Image className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Photos</span>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-pink-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'video' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <Film className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Video</span>
            </button>
            <button
              onClick={() => setActiveTab('streams')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'streams'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-red-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'streams' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <Video className="w-4 h-4 relative z-10" />
              <span className="hidden sm:inline relative z-10">Streams</span>
              <span className="sm:hidden relative z-10">Live</span>
            </button>
            <button
              onClick={() => setActiveTab('shows')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'shows'
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-yellow-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'shows' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <Ticket className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Shows</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`group relative px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'about'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-purple-500/50 hover:scale-105'
              }`}
            >
              {activeTab === 'about' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              )}
              <UserCircle className="w-4 h-4 relative z-10" />
              <span className="relative z-10">About</span>
            </button>
          </div>

          {/* Content Card with Glassmorphism */}
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">

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
                    <div>
                      {content.filter(c => c.type === 'photo').length === 0 ? (
                        <div className="text-center py-16">
                          <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50"></div>
                            <Image className="relative w-20 h-20 mx-auto text-gray-400" />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">No photos yet</h3>
                          <p className="text-gray-400 px-4">
                            Check back later for photo uploads
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                          {content.filter(c => c.type === 'photo').map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                console.log('Photo clicked:', item);
                                if (item.isLocked && !item.isFree) {
                                  // TODO: Implement unlock/purchase flow
                                  alert(`This content costs ${item.unlockPrice} coins to unlock. Purchase feature coming soon!`);
                                } else {
                                  setSelectedPhoto(item);
                                }
                              }}
                              className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 border border-white/10 hover:border-cyan-500/50"
                            >
                              {/* Glow Effect */}
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-75 blur transition duration-500"></div>

                              {/* Card Content */}
                              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900">
                                {/* Image */}
                                {item.thumbnail ? (
                                  <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-900 via-purple-900 to-slate-900 flex items-center justify-center">
                                    <Image className="w-16 h-16 text-gray-600" />
                                  </div>
                                )}

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

                                {/* Lock indicator */}
                                {item.isLocked && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md bg-black/60 pointer-events-none">
                                    <div className="relative mb-3">
                                      <div className="absolute -inset-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur opacity-75"></div>
                                      <div className="relative p-4 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                                        <Lock className="w-8 h-8 text-yellow-400" />
                                      </div>
                                    </div>
                                    {item.unlockPrice && item.unlockPrice > 0 && (
                                      <div className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm shadow-lg">
                                        {item.unlockPrice} coins
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Info on hover */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-0 group-hover:backdrop-blur-md transition-all pointer-events-none">
                                  <h3 className="text-white font-bold text-sm line-clamp-1 mb-1 drop-shadow-lg">
                                    {item.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-gray-300">
                                    {item.views !== undefined && (
                                      <span className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                                        {item.views} views
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Tab */}
                  {activeTab === 'video' && (
                    <div>
                      {content.filter(c => c.type === 'video').length === 0 ? (
                        <div className="text-center py-12">
                          <Film className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
                          <p className="text-gray-400 px-4">
                            Check back later for video content
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {content.filter(c => c.type === 'video').map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (!item.isLocked) {
                                  setSelectedVideo(item);
                                }
                              }}
                              className="group relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                            >
                              {/* Thumbnail */}
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt={item.title}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-digis-cyan/30 via-digis-purple/30 to-digis-pink/30 flex items-center justify-center">
                                  <Film className="w-12 h-12 text-gray-400" />
                                </div>
                              )}

                              {/* Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                              {/* Play button */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="p-4 rounded-full bg-black/60 backdrop-blur-md group-hover:scale-110 transition-transform">
                                  <Play className="w-8 h-8 text-white" fill="white" />
                                </div>
                              </div>

                              {/* Lock indicator */}
                              {item.isLocked && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-2xl z-20">
                                  <div className="p-3 rounded-full bg-black/60 backdrop-blur-md mb-2">
                                    <Lock className="w-6 h-6 text-white" />
                                  </div>
                                  {item.unlockPrice && item.unlockPrice > 0 && (
                                    <div className="px-3 py-1.5 rounded-full bg-amber-500 text-white font-bold text-xs">
                                      {item.unlockPrice} coins
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Info */}
                              <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                                <h3 className="text-white font-bold text-sm line-clamp-1 mb-1">
                                  {item.title}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-white/90">
                                  {item.views !== undefined && (
                                    <span>{item.views} views</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Streams Tab */}
                  {activeTab === 'streams' && (
                    <div>
                      {streams.length === 0 ? (
                        <div className="text-center py-12">
                          <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold text-white mb-2">No past streams yet</h3>
                          <p className="text-gray-400 mb-4 px-4">
                            {isFollowing
                              ? "You'll be notified when they go live"
                              : 'Follow to get notified when they go live'}
                          </p>
                          {!isFollowing && (
                            <button
                              onClick={handleFollowToggle}
                              className="px-6 py-2.5 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-xl font-semibold hover:scale-105 transition-transform shadow-fun"
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
                          <h3 className="text-lg font-semibold text-white mb-2">No upcoming shows</h3>
                          <p className="text-gray-400 px-4">
                            Check back later for ticketed events and special shows
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {shows.map((show: any) => (
                            <button
                              key={show.id}
                              onClick={() => router.push(`/shows/${show.id}`)}
                              className="w-full flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-xl border-2 border-purple-500/30 hover:border-purple-500 transition-all text-left"
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
                                <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 mb-1">{show.title}</h3>
                                {show.description && (
                                  <p className="text-sm text-gray-300 line-clamp-2 mb-2">{show.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                  <span className="flex items-center gap-1 text-gray-300">
                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    {new Date(show.scheduledStart).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                  <span className="text-yellow-400 font-bold">
                                    {show.ticketPrice?.toLocaleString()} coins
                                  </span>
                                  {show.ticketsSold !== undefined && show.maxTickets && (
                                    <span className="text-gray-300">
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
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-digis-cyan" />
                          About
                        </h3>
                        {user.bio ? (
                          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
                        ) : (
                          <p className="text-gray-400 italic">No bio yet</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                              {followCounts.followers.toLocaleString()}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 font-medium">Followers</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-xl border-2 border-cyan-200 hover:border-cyan-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                              {streams.length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 font-medium">Past Streams</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-xl border-2 border-pink-200 hover:border-pink-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                              {shows.length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 font-medium">Upcoming Shows</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-colors">
                            <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                              {new Date(user.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 font-medium">Joined</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && profile && (
        <TipModal
          onClose={() => setShowTipModal(false)}
          onSend={handleSendTip}
          receiverName={profile.user.displayName || profile.user.username}
        />
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-gray-900 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video player */}
            <video
              src={selectedVideo.url}
              controls
              autoPlay
              className="w-full aspect-video bg-black"
            />

            {/* Video info */}
            <div className="p-6 bg-gray-900">
              <h3 className="text-xl font-bold text-white mb-2">{selectedVideo.title}</h3>
              {selectedVideo.description && (
                <p className="text-gray-300 text-sm">{selectedVideo.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Photo */}
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
            />

            {/* Photo info */}
            <div className="mt-4 p-6 bg-gray-900 rounded-2xl">
              <h3 className="text-xl font-bold text-white mb-2">{selectedPhoto.title}</h3>
              {selectedPhoto.description && (
                <p className="text-gray-300 text-sm">{selectedPhoto.description}</p>
              )}
              {selectedPhoto.views !== undefined && (
                <p className="text-gray-400 text-sm mt-2">{selectedPhoto.views} views</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
