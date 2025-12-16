'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { UserCircle, Calendar, ShieldCheck, MessageCircle, Video, Ticket, Gift, Clock, Phone, Star, Sparkles, Image, Film, Mic, CheckCircle, Lock, Play, Coins, AlertCircle, Heart } from 'lucide-react';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import ProfileLiveSection from '@/components/profile/ProfileLiveSection';
import { TipModal } from '@/components/messages/TipModal';
import { ParallaxBanner } from '@/components/profile/ParallaxBanner';
import { AnimatedAvatar } from '@/components/profile/AnimatedAvatar';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { ProfileGoalsWidget } from '@/components/profile/ProfileGoalsWidget';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { ContentUnlockModal } from '@/components/content/ContentUnlockModal';
import { SignUpPromptModal } from '@/components/auth/SignUpPromptModal';
import { useToastContext } from '@/context/ToastContext';

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
  messageRate?: number;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showError, showInfo } = useToastContext();
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
  const [activeTab, setActiveTab] = useState<'photos' | 'video' | 'streams' | 'about'>('photos');
  const [streams, setStreams] = useState<any[]>([]); // Combined streams and shows
  const [isLive, setIsLive] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [isColdOutreach, setIsColdOutreach] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contentToUnlock, setContentToUnlock] = useState<any>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpAction, setSignUpAction] = useState<string>('');
  const [showSubscribeSuccessModal, setShowSubscribeSuccessModal] = useState(false);
  const [showSubscribeConfirmModal, setShowSubscribeConfirmModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [insufficientFundsAmount, setInsufficientFundsAmount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [showTipSuccessModal, setShowTipSuccessModal] = useState(false);
  const [tipSuccessAmount, setTipSuccessAmount] = useState(0);

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fetch profile (includes goals & content) and auth in parallel
    // Profile API now returns goals and content to reduce API calls
    Promise.all([
      fetchProfile(),
      checkAuth(),
      checkIfLive(),
    ]);
  }, [username]);

  // Fetch VODs/shows after we have the profile (needs user.id)
  useEffect(() => {
    if (profile?.user.id && profile.user.role === 'creator') {
      fetchContent();

      // Poll for live status every 30 seconds
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

  // Helper to require auth before action
  const requireAuth = (action: string, callback: () => void) => {
    if (!isAuthenticated) {
      setSignUpAction(action);
      setShowSignUpModal(true);
      return;
    }
    callback();
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

      // Set goals and content from profile response (now included in API)
      if (data.goals) setGoals(data.goals);
      if (data.content) {
        // Transform content to bento grid format
        const bentaContent = data.content.map((item: any) => ({
          id: item.id,
          type: item.contentType === 'video' ? 'video' : 'photo',
          title: item.title,
          thumbnail: item.thumbnailUrl,
          url: item.mediaUrl,
          description: item.description,
          likes: item.likeCount || 0,
          isLiked: item.isLiked || false,
          views: item.viewCount,
          // Content is locked if: not free AND user hasn't purchased it
          isLocked: !item.isFree && !item.hasPurchased,
          unlockPrice: item.unlockPrice,
          isFree: item.isFree,
          timestamp: new Date(item.createdAt).toLocaleDateString(),
          featured: false,
        }));
        setContent(bentaContent);
      }

      // Check subscription status if creator (parallel, non-blocking)
      if (data.user.role === 'creator') {
        Promise.all([
          checkSubscription(data.user.id),
          fetchSubscriptionTier(data.user.id)
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

  const fetchContent = async () => {
    if (!profile?.user.id) return;

    setContentLoading(true);
    try {
      // Fetch saved streams (VODs) and shows in parallel
      const [vodsRes, showsRes] = await Promise.all([
        fetch(`/api/vods/my-vods?userId=${profile.user.id}`),
        fetch(`/api/shows/creator?creatorId=${profile.user.id}`)
      ]);

      const allStreamContent: any[] = [];

      if (vodsRes.ok) {
        const vodsData = await vodsRes.json();
        const vodsList = vodsData.vods || [];
        // Transform VODs to match streams format for display
        const savedStreams = vodsList.slice(0, 12).map((vod: any) => ({
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
          sortDate: new Date(vod.createdAt),
        }));
        allStreamContent.push(...savedStreams);
      }

      if (showsRes.ok) {
        const showsData = await showsRes.json();
        const showsList = Array.isArray(showsData.data) ? showsData.data : [];
        // Only show upcoming and live shows
        const upcomingShows = showsList
          .filter((s: any) => ['scheduled', 'live'].includes(s.status))
          .map((show: any) => ({
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

      // Sort: upcoming ticketed shows first (by date), then past VODs (by date desc)
      allStreamContent.sort((a, b) => {
        // Ticketed upcoming shows come first
        if (a.isTicketed && !b.isTicketed) return -1;
        if (!a.isTicketed && b.isTicketed) return 1;
        // Within same type, sort by date
        if (a.isTicketed && b.isTicketed) {
          return a.sortDate.getTime() - b.sortDate.getTime(); // Upcoming: earliest first
        }
        return b.sortDate.getTime() - a.sortDate.getTime(); // VODs: newest first
      });

      setStreams(allStreamContent);
    } catch (err) {
      console.error('Error fetching content:', err);
    } finally {
      setContentLoading(false);
    }
  };

  const checkIfLive = async () => {
    try {
      // Use cache bust to ensure fresh data
      const response = await fetch(`/api/streams/live?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        const streamsList = data.data?.streams || [];
        // Match by username (works before profile loads) or by id (works after)
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
        // Transform content to bento grid format
        const bentaContent = data.content.map((item: any) => ({
          id: item.id,
          type: item.contentType === 'video' ? 'video' : item.contentType === 'photo' ? 'photo' : 'photo',
          title: item.title,
          thumbnail: item.thumbnailUrl,
          url: item.mediaUrl,
          description: item.description,
          likes: item.likeCount || 0,
          isLiked: item.isLiked || false,
          views: item.viewCount,
          // Content is locked if: not free AND user hasn't purchased it
          isLocked: !item.isFree && !item.hasPurchased,
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

    // Require auth for follow action
    if (!isAuthenticated) {
      setSignUpAction('follow this creator');
      setShowSignUpModal(true);
      return;
    }

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
      showError(err.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (subscribeLoading || !profile?.user.id) return;

    // Require auth for subscribe action
    if (!isAuthenticated) {
      setSignUpAction('subscribe to this creator');
      setShowSignUpModal(true);
      return;
    }

    setSubscribeLoading(true);
    try {
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: profile.user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's an insufficient funds error
        if (data.error?.includes('Insufficient') || data.error?.includes('need') || data.required) {
          setInsufficientFundsAmount(data.required || subscriptionTier?.pricePerMonth || 0);
          setShowInsufficientFundsModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubscribed(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setShowSubscribeSuccessModal(true);
    } catch (err: any) {
      console.error('Subscribe error:', err);
      // Show insufficient funds modal for balance-related errors
      if (err.message?.includes('Insufficient') || err.message?.includes('need')) {
        setInsufficientFundsAmount(subscriptionTier?.pricePerMonth || 0);
        setShowInsufficientFundsModal(true);
      } else {
        // For other errors, show a simple themed error (not browser alert)
        setInsufficientFundsAmount(0);
        setShowInsufficientFundsModal(true);
      }
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;

    // Require auth for message action
    if (!isAuthenticated) {
      setSignUpAction('send messages');
      setShowSignUpModal(true);
      return;
    }

    try {
      // Check if user is authenticated
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // User not authenticated, show sign up modal
        setSignUpAction('send messages');
        setShowSignUpModal(true);
        return;
      }

      // Check if user is trying to message themselves
      const currentUserResponse = await fetch('/api/user/profile');
      let currentUserData: any = null;

      if (currentUserResponse.ok) {
        currentUserData = await currentUserResponse.json();
        if (currentUserData.user?.id === profile.user.id) {
          showInfo("You can't message yourself");
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

      // No existing conversation - check if there's a message rate or cold outreach fee
      const currentUser = currentUserData?.user;
      const isCreatorMessagingFan = currentUser?.role === 'creator' && profile.user.role !== 'creator';
      const messageRate = profile.messageRate || 0;

      // If creator has a message rate or if it's a creator messaging a fan, show confirmation modal
      if (messageRate > 0 || isCreatorMessagingFan) {
        setIsColdOutreach(isCreatorMessagingFan && messageRate === 0);
        setShowMessageModal(true);
        return;
      }

      // No fees - proceed directly to create conversation
      await createConversation();
    } catch (error) {
      console.error('Error starting conversation:', error);
      showError('Failed to start conversation. Please try again.');
    }
  };

  const createConversation = async () => {
    if (!profile) return;

    setMessageLoading(true);
    try {
      // Create conversation without sending any message - let user type their own first message
      const createResponse = await fetch('/api/messages/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: profile.user.id,
        }),
      });

      if (createResponse.ok) {
        const createData = await createResponse.json();
        setShowMessageModal(false);
        // Navigate to the conversation - user can type their own first message
        router.push(`/chats/${createData.conversationId}`);
      } else {
        const errorData = await createResponse.json();
        showError(errorData.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      showError('Failed to start conversation. Please try again.');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleLikeContent = async (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the content modal

    // Require auth for like action
    if (!isAuthenticated) {
      setSignUpAction('like content');
      setShowSignUpModal(true);
      return;
    }

    // Optimistic update
    setContent(prev => prev.map(item => {
      if (item.id === contentId) {
        const wasLiked = item.isLiked;
        return {
          ...item,
          isLiked: !wasLiked,
          likes: wasLiked ? Math.max(0, item.likes - 1) : item.likes + 1,
        };
      }
      return item;
    }));

    try {
      const response = await fetch('/api/content/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      });

      if (!response.ok) {
        // Revert on error
        setContent(prev => prev.map(item => {
          if (item.id === contentId) {
            const wasLiked = item.isLiked;
            return {
              ...item,
              isLiked: !wasLiked,
              likes: wasLiked ? Math.max(0, item.likes - 1) : item.likes + 1,
            };
          }
          return item;
        }));
      }
    } catch (error) {
      console.error('Error liking content:', error);
      // Revert on error
      setContent(prev => prev.map(item => {
        if (item.id === contentId) {
          const wasLiked = item.isLiked;
          return {
            ...item,
            isLiked: !wasLiked,
            likes: wasLiked ? Math.max(0, item.likes - 1) : item.likes + 1,
          };
        }
        return item;
      }));
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

      // Success! Show Tron-themed success modal
      setTipSuccessAmount(amount);
      setShowTipSuccessModal(true);
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
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-24 md:pb-8 ${isAuthenticated ? 'md:pl-20' : ''} relative overflow-hidden`}>
      {/* Mobile Header with Logo and Wallet */}
      <MobileHeader />

      {/* Animated Background Mesh - Tron Theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Confetti Effect */}
      <ConfettiEffect show={showConfetti} duration={2000} />

      {/* Spacer for fixed mobile header - matches MobileHeader h-16 (64px) */}
      <div className="md:hidden" style={{ height: 'calc(64px + env(safe-area-inset-top, 0px))' }} />

      {/* Banner with Parallax Effect */}
      <div className="relative">
        <ParallaxBanner imageUrl={user.bannerUrl} height={user.bannerUrl ? "h-48 sm:h-64 md:h-96" : "h-40 sm:h-40 md:h-48"} username={user.username} />
        {/* Gradient Overlay for better contrast - Tron Theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90"></div>
      </div>

      {/* Profile Content - Mobile optimized */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Avatar and Header Section - Modern Glass Card */}
        <div className="relative -mt-24 sm:-mt-28 mb-8">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-6 sm:p-8">
            {/* Top Row: Avatar, Name, Follow Button */}
            <div className="flex items-start gap-4 sm:gap-6">
              {/* Animated Avatar with Neon Glow */}
              <div className="relative group flex-shrink-0">
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

              {/* Name, Username, Followers + Buttons */}
              <div className="flex-1 min-w-0">
                {/* Name with Verification Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white truncate bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
                    {user.displayName || user.username}
                  </h1>
                  {user.isCreatorVerified && (
                    <div className="relative flex-shrink-0 group" title="Verified Creator">
                      <div className="absolute -inset-1 bg-blue-500 rounded-full blur opacity-75 group-hover:opacity-100"></div>
                      <CheckCircle className="relative w-5 h-5 sm:w-6 sm:h-6 text-white fill-blue-500" strokeWidth={2.5} />
                    </div>
                  )}
                </div>
                {user.displayName && (
                  <p className="text-cyan-300/90 text-sm sm:text-base mb-1 truncate">@{user.username}</p>
                )}

                {/* New Creator Badge - show if creator joined within last 30 days */}
                {(() => {
                  if (user.role !== 'creator') return null;
                  const daysSinceJoined = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  return daysSinceJoined <= 30 ? (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-amber-400 mb-3">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>New Creator</span>
                    </div>
                  ) : null;
                })()}

                {/* Follow & Subscribe Buttons - Below name on mobile, inline on desktop */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`px-3 py-1 rounded-full font-medium text-xs transition-all duration-300 disabled:opacity-50 ${
                      isFollowing
                        ? 'bg-white/10 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-105 shadow-sm shadow-cyan-500/30'
                    }`}
                  >
                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>

                  {/* Subscribe Button - Don't show on own profile */}
                  {user.role === 'creator' && subscriptionTier && !isSubscribed && currentUserId !== user.id && (
                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setSignUpAction('subscribe to this creator');
                          setShowSignUpModal(true);
                          return;
                        }
                        setShowSubscribeConfirmModal(true);
                      }}
                      className="px-3 py-1 rounded-full font-medium text-xs transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 shadow-sm shadow-purple-500/30"
                    >
                      Subscribe
                    </button>
                  )}

                  {/* Subscribed Badge - Don't show on own profile */}
                  {user.role === 'creator' && isSubscribed && currentUserId !== user.id && (
                    <div className="px-3 py-1 rounded-full font-medium text-xs bg-white/10 border border-purple-500/50 text-purple-400">
                      Subscribed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-gray-300 mt-4 text-sm sm:text-base leading-relaxed line-clamp-3">
                {user.bio}
              </p>
            )}

          {/* Action Buttons Row */}
          <div className="mt-5 flex flex-wrap gap-2 sm:gap-3">
            {/* Video Call Button */}
            {user.role === 'creator' && profile.callSettings && currentUserId !== user.id && (
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
            {user.role === 'creator' && profile.callSettings && currentUserId !== user.id && (
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

            {/* Chat Button */}
            <button
              onClick={handleMessage}
              className="group px-4 py-2 rounded-full bg-white/10 border border-white/20 hover:border-digis-cyan/50 transition-all hover:scale-105 flex items-center gap-2 text-white text-sm font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat</span>
            </button>

            {/* Tip Button */}
            {user.role === 'creator' && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    setSignUpAction('send tips');
                    setShowSignUpModal(true);
                    return;
                  }
                  if (currentUserId === user.id) {
                    showInfo("You can't tip yourself");
                    return;
                  }
                  setShowTipModal(true);
                }}
                className="group w-10 h-10 rounded-full bg-white/10 border border-white/20 hover:border-yellow-500/50 transition-all hover:scale-105 flex items-center justify-center text-white"
              >
                <Gift className="w-4 h-4" />
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Inline Live Stream Section */}
        <ProfileLiveSection
          username={user.username}
          isAuthenticated={isAuthenticated}
          onRequireAuth={(action) => {
            setSignUpAction(action);
            setShowSignUpModal(true);
          }}
        />

        {/* Profile Goals Widget */}
        {user.role === 'creator' && goals.length > 0 && (
          <div className="mb-6">
            <ProfileGoalsWidget goals={goals} maxDisplay={3} onGoalUpdate={fetchGoals} />
          </div>
        )}

        {/* Content Tabs - Futuristic Design */}
        <div className="mb-8">
          {/* Tab Pills - Glassmorphism */}
          <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto pt-2 pb-2 px-1">
            <button
              onClick={() => setActiveTab('photos')}
              className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'photos'
                  ? 'bg-gradient-to-r from-digis-cyan to-blue-500 text-white shadow-md shadow-cyan-500/40'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-digis-cyan/50'
              }`}
            >
              <Image className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Photos</span>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md shadow-pink-500/40'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-pink-500/50'
              }`}
            >
              <Film className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Video</span>
            </button>
            <button
              onClick={() => setActiveTab('streams')}
              className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'streams'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-md shadow-red-500/40'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-red-500/50'
              }`}
            >
              <Video className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Streams</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`group relative px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'about'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/40'
                  : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:border-purple-500/50'
              }`}
            >
              <UserCircle className="w-3.5 h-3.5 relative z-10" />
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
                                if (item.isLocked && !item.isFree && item.unlockPrice > 0) {
                                  // Show unlock modal
                                  setContentToUnlock({
                                    id: item.id,
                                    title: item.title,
                                    type: 'photo',
                                    unlockPrice: item.unlockPrice,
                                    thumbnail: item.thumbnail,
                                    creatorName: profile?.user.displayName || profile?.user.username || 'Creator',
                                  });
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
                                    onError={(e) => {
                                      // Replace broken image with placeholder
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement?.querySelector('.photo-placeholder')?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`absolute inset-0 bg-gradient-to-br from-cyan-900 via-purple-900 to-slate-900 flex items-center justify-center photo-placeholder ${item.thumbnail ? 'hidden' : ''}`}>
                                  <Image className="w-16 h-16 text-gray-600" />
                                </div>

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

                                {/* Like button - top right */}
                                {!item.isLocked && (
                                  <button
                                    onClick={(e) => handleLikeContent(item.id, e)}
                                    className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all group/heart"
                                  >
                                    <Heart
                                      className={`w-5 h-5 transition-all ${
                                        item.isLiked
                                          ? 'text-red-500 fill-red-500 scale-110'
                                          : 'text-white group-hover/heart:text-red-400'
                                      }`}
                                    />
                                  </button>
                                )}

                                {/* Info on hover */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-0 group-hover:backdrop-blur-md transition-all pointer-events-none">
                                  <h3 className="text-white font-bold text-sm line-clamp-1 drop-shadow-lg">
                                    {item.title}
                                  </h3>
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
                                if (item.isLocked && item.unlockPrice > 0) {
                                  // Show unlock modal
                                  setContentToUnlock({
                                    id: item.id,
                                    title: item.title,
                                    type: 'video',
                                    unlockPrice: item.unlockPrice,
                                    thumbnail: item.thumbnail,
                                    creatorName: profile?.user.displayName || profile?.user.username || 'Creator',
                                  });
                                } else {
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
                                  onError={(e) => {
                                    // Replace broken image with placeholder
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement?.querySelector('.video-placeholder')?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`absolute inset-0 bg-gradient-to-br from-digis-cyan/30 via-digis-purple/30 to-digis-pink/30 flex items-center justify-center video-placeholder ${item.thumbnail ? 'hidden' : ''}`}>
                                <Film className="w-12 h-12 text-gray-400" />
                              </div>

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

                              {/* Like button - top right */}
                              {!item.isLocked && (
                                <button
                                  onClick={(e) => handleLikeContent(item.id, e)}
                                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all group/heart"
                                >
                                  <Heart
                                    className={`w-5 h-5 transition-all ${
                                      item.isLiked
                                        ? 'text-red-500 fill-red-500 scale-110'
                                        : 'text-white group-hover/heart:text-red-400'
                                    }`}
                                  />
                                </button>
                              )}

                              {/* Info */}
                              <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                                <h3 className="text-white font-bold text-sm line-clamp-1">
                                  {item.title}
                                </h3>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Streams Tab - Shows saved streams (VODs) and ticketed shows */}
                  {activeTab === 'streams' && (
                    <div>
                      {streams.length === 0 ? (
                        <div className="text-center py-12">
                          <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <h3 className="text-lg font-semibold text-white mb-2">No streams yet</h3>
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
                              onClick={() => router.push(stream.isTicketed ? `/streams/${stream.id}` : `/vod/${stream.id}`)}
                              className={`group relative aspect-video rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:scale-105 ${
                                stream.isTicketed
                                  ? 'border-2 border-purple-500/50 hover:border-purple-500 bg-gradient-to-br from-purple-900/40 to-pink-900/40'
                                  : 'border-2 border-cyan-500/30 hover:border-cyan-500 bg-gray-900'
                              }`}
                            >
                              {/* Thumbnail */}
                              {stream.thumbnailUrl ? (
                                <img
                                  src={stream.thumbnailUrl}
                                  alt={stream.title}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className={`absolute inset-0 flex items-center justify-center ${
                                  stream.isTicketed
                                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
                                    : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                                }`}>
                                  {stream.isTicketed ? (
                                    <Ticket className="w-12 h-12 text-purple-400 group-hover:scale-110 transition-transform" />
                                  ) : (
                                    <Video className="w-12 h-12 text-cyan-400 group-hover:scale-110 transition-transform" />
                                  )}
                                </div>
                              )}

                              {/* Ticketed Badge */}
                              {stream.isTicketed && (
                                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-lg shadow-lg">
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>Ticketed</span>
                                </div>
                              )}

                              {/* LIVE Badge for ticketed shows */}
                              {stream.isTicketed && stream.status === 'live' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg animate-pulse">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                  LIVE
                                </div>
                              )}

                              {/* PPV Badge for VODs */}
                              {!stream.isTicketed && stream.priceCoins > 0 && (
                                <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-lg">
                                  {stream.priceCoins} coins
                                </div>
                              )}

                              {/* Stream info overlay */}
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-3 sm:p-4">
                                <h4 className="text-white font-semibold text-sm sm:text-base line-clamp-1 mb-1">
                                  {stream.title}
                                </h4>
                                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-300">
                                  {stream.isTicketed ? (
                                    <>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(stream.scheduledStart).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                      <span className="text-yellow-400 font-bold">
                                        {stream.ticketPrice?.toLocaleString()} coins
                                      </span>
                                    </>
                                  ) : (
                                    <span>
                                      {new Date(stream.endedAt || stream.startedAt).toLocaleDateString()}
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
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                          <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-xl border-2 border-cyan-200 hover:border-cyan-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                              {streams.length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 font-medium">Streams</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-500/5 rounded-xl border-2 border-pink-200 hover:border-pink-400 transition-colors">
                            <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                              {content.length}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-300 font-medium">Media</div>
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

      {/* Tip Success Modal - Tron Theme */}
      {showTipSuccessModal && profile && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowTipSuccessModal(false)}
        >
          <div
            className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.3)] animate-in zoom-in-95 duration-200 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/20 to-green-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>

            <div className="relative text-center">
              {/* Success Icon */}
              <div className="relative inline-block mb-4">
                <div className="absolute -inset-3 bg-green-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.5)]">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-green-100 to-white bg-clip-text text-transparent mb-2">
                Tip Sent!
              </h3>

              {/* Amount */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 mb-4 border border-green-500/30">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {tipSuccessAmount}
                </div>
                <p className="text-gray-400 text-sm mt-1">coins sent to</p>
                <p className="text-white font-semibold">{profile.user.displayName || profile.user.username}</p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowTipSuccessModal(false)}
                className="w-full px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105 transition-all shadow-lg"
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Content Unlock Modal */}
      {contentToUnlock && (
        <ContentUnlockModal
          content={contentToUnlock}
          onClose={() => setContentToUnlock(null)}
          onSuccess={() => {
            setContentToUnlock(null);
            // Refresh content to show unlocked item
            fetchCreatorContent();
          }}
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
            </div>
          </div>
        </div>
      )}

      {/* Message Confirmation Modal - Using Portal for proper z-index */}
      {showMessageModal && profile && mounted && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowMessageModal(false)}
        >
          <div
            className="relative backdrop-blur-2xl bg-gradient-to-br from-black/40 via-gray-900/60 to-black/40 rounded-3xl p-8 max-w-sm w-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(34,211,238,0.3)] animate-in zoom-in-95 duration-200 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated gradient border effect */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 animate-shimmer" style={{animation: 'shimmer 3s infinite'}} />
            </div>

            <div className="relative">
              {/* Close button */}
              <button
                onClick={() => setShowMessageModal(false)}
                className="absolute top-0 right-0 text-gray-400 hover:text-white transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Icon and Title */}
              <div className="text-center mb-6">
                <div className="relative inline-block mb-4">
                  <div className="absolute -inset-2 bg-cyan-500/30 rounded-full blur-xl"></div>
                  <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent mb-1">
                  Start Chat
                </h3>
                <p className="text-gray-400 text-sm">with {profile.user.displayName || profile.user.username}</p>
              </div>

              {/* Cost Info - Tron Style */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl p-6 mb-6 text-center border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <p className="text-gray-400 text-sm mb-2 font-medium">
                  {isColdOutreach ? 'One-time unlock fee' : 'Cost per message'}
                </p>
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {profile.messageRate && profile.messageRate > 0 ? profile.messageRate : 50}
                </div>
                <p className="text-gray-400 text-sm mt-1 font-medium">coins</p>
                {isColdOutreach && (
                  <p className="text-gray-500 text-xs mt-2">Messages are free after unlocking</p>
                )}
              </div>

              {/* Action Buttons - Tron Style */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={createConversation}
                  disabled={messageLoading}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {messageLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Starting...</span>
                    </div>
                  ) : (
                    'Start Chat'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sign Up Prompt Modal */}
      <SignUpPromptModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        action={signUpAction}
        creatorName={profile?.user.displayName || profile?.user.username}
      />

      {/* Subscribe Confirmation Modal */}
      {showSubscribeConfirmModal && profile && subscriptionTier && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowSubscribeConfirmModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-black/95 rounded-3xl p-8 border-2 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_40px_rgba(168,85,247,0.1)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowSubscribeConfirmModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)]">
                  <Star className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                Subscribe to {profile.user.displayName || profile.user.username}
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Get exclusive access to premium content
              </p>
            </div>

            {/* Price */}
            <div className="flex justify-center mb-6">
              <div className="px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <div className="text-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {subscriptionTier.pricePerMonth}
                  </span>
                  <span className="text-gray-300 ml-2">coins/month</span>
                </div>
              </div>
            </div>

            {/* Benefits */}
            {subscriptionTier.benefits && (
              <div className="mb-6 text-sm text-gray-300 space-y-2">
                {(Array.isArray(subscriptionTier.benefits)
                  ? subscriptionTier.benefits
                  : JSON.parse(subscriptionTier.benefits || '[]')
                ).slice(0, 3).map((benefit: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubscribeConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSubscribeConfirmModal(false);
                  handleSubscribe();
                }}
                disabled={subscribeLoading}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:hover:scale-100"
              >
                {subscribeLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Funds Modal - Tron Theme */}
      {showInsufficientFundsModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowInsufficientFundsModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-black/95 rounded-3xl p-8 border-2 border-cyan-500/50 shadow-[0_0_60px_rgba(34,211,238,0.4),inset_0_0_40px_rgba(34,211,238,0.1)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-yellow-500/20 to-cyan-500/20 blur-xl -z-10 animate-pulse" />

            {/* Close button */}
            <button
              onClick={() => setShowInsufficientFundsModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.4)]">
                  <Coins className="w-10 h-10 text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                Not Enough Coins
              </h2>
              <p className="text-gray-400 mb-6">
                {insufficientFundsAmount > 0
                  ? `You need ${insufficientFundsAmount} coins to subscribe`
                  : 'You need more coins to complete this action'
                }
              </p>
            </div>

            {/* Coin display */}
            <div className="flex justify-center mb-6">
              <div className="px-6 py-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-3">
                  <Coins className="w-8 h-8 text-yellow-400" />
                  <span className="text-3xl font-bold text-yellow-400">
                    {insufficientFundsAmount > 0 ? insufficientFundsAmount : '???'}
                  </span>
                  <span className="text-gray-400">needed</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowInsufficientFundsModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInsufficientFundsModal(false);
                  router.push('/wallet');
                }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:scale-105 transition-all shadow-lg shadow-yellow-500/30 flex items-center justify-center gap-2"
              >
                <Coins className="w-5 h-5" />
                Buy Coins
              </button>
            </div>

            {/* Neon line decoration */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          </div>
        </div>
      )}

      {/* Subscribe Success Modal - Tron Theme */}
      {showSubscribeSuccessModal && profile && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowSubscribeSuccessModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-black/95 rounded-3xl p-8 border-2 border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4),inset_0_0_40px_rgba(168,85,247,0.1)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 blur-xl -z-10 animate-pulse" />

            {/* Sparkle icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.6)]">
                  <Star className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3">
                You're In! 🎉
              </h2>
              <p className="text-gray-300 mb-2">
                Welcome to the inner circle of
              </p>
              <p className="text-xl font-bold text-white mb-6">
                {profile.user.displayName || profile.user.username}
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Unlock exclusive content, special perks, and direct access. Let's go! ✨
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowSubscribeSuccessModal(false)}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-xl text-white font-bold transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.4)]"
            >
              Let's Go!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
