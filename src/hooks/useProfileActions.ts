'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToastContext } from '@/context/ToastContext';
import type { ProfileData, ContentItem, ContentToUnlock, TipSuccessGift, InsufficientFundsDetails } from '@/components/profile/types';

interface UseProfileActionsParams {
  profile: ProfileData | null;
  isAuthenticated: boolean;
  currentUserId: string | null;
  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
  isSubscribed: boolean;
  setIsSubscribed: (v: boolean) => void;
  subscriptionTier: any;
  setProfile: (p: ProfileData | null) => void;
  content: ContentItem[];
  setContent: React.Dispatch<React.SetStateAction<ContentItem[]>>;
  fetchCreatorContent: () => Promise<void>;
}

export function useProfileActions({
  profile,
  isAuthenticated,
  currentUserId,
  isFollowing,
  setIsFollowing,
  isSubscribed,
  setIsSubscribed,
  subscriptionTier,
  setProfile,
  content,
  setContent,
  fetchCreatorContent,
}: UseProfileActionsParams) {
  const router = useRouter();
  const { showError, showInfo } = useToastContext();

  const [followLoading, setFollowLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Modal flags
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [isColdOutreach, setIsColdOutreach] = useState(false);

  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [contentToUnlock, setContentToUnlock] = useState<ContentToUnlock | null>(null);

  // Auth modals
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpAction, setSignUpAction] = useState<string>('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpFormModal, setShowSignUpFormModal] = useState(false);

  // Subscribe modals
  const [showSubscribeConfirmModal, setShowSubscribeConfirmModal] = useState(false);
  const [showSubscribeSuccessModal, setShowSubscribeSuccessModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [insufficientFundsAmount, setInsufficientFundsAmount] = useState(0);
  const [insufficientFundsDetails, setInsufficientFundsDetails] = useState<InsufficientFundsDetails | null>(null);

  // Tip success
  const [showTipSuccessModal, setShowTipSuccessModal] = useState(false);
  const [tipSuccessAmount, setTipSuccessAmount] = useState(0);
  const [tipSuccessGift, setTipSuccessGift] = useState<TipSuccessGift | null>(null);

  const requireAuth = (action: string, callback: () => void) => {
    if (!isAuthenticated) {
      setSignUpAction(action);
      setShowSignUpModal(true);
      return;
    }
    callback();
  };

  const handleFollowToggle = async () => {
    if (followLoading || !profile) return;

    if (!isAuthenticated) {
      setSignUpAction('follow this creator');
      setShowSignUpModal(true);
      return;
    }

    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/follow/${profile.user.id}`, { method });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      setIsFollowing(!isFollowing);

      if (!isFollowing) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

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
        if (data.error?.includes('already subscribed')) {
          setIsSubscribed(true);
          setShowSubscribeSuccessModal(true);
          return;
        }
        if (data.insufficientBalance || data.error?.includes('Insufficient') || data.error?.includes('need') || data.error?.includes('Not enough') || data.required) {
          setInsufficientFundsAmount(data.required || subscriptionTier?.pricePerMonth || 50);
          if (data.held !== undefined) {
            setInsufficientFundsDetails({
              available: data.available || 0,
              total: data.total || 0,
              held: data.held || 0,
            });
          } else {
            setInsufficientFundsDetails(null);
          }
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
      if (err.message?.includes('Insufficient') || err.message?.includes('need')) {
        setInsufficientFundsAmount(subscriptionTier?.pricePerMonth || 0);
        setInsufficientFundsDetails(null);
        setShowInsufficientFundsModal(true);
      } else {
        setInsufficientFundsAmount(0);
        setInsufficientFundsDetails(null);
        setShowInsufficientFundsModal(true);
      }
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;

    if (!isAuthenticated) {
      setSignUpAction('send messages');
      setShowSignUpModal(true);
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setSignUpAction('send messages');
        setShowSignUpModal(true);
        return;
      }

      const currentUserResponse = await fetch('/api/user/profile');
      let currentUserData: any = null;

      if (currentUserResponse.ok) {
        currentUserData = await currentUserResponse.json();
        if (currentUserData.user?.id === profile.user.id) {
          showInfo("You can't message yourself");
          return;
        }
      }

      const response = await fetch('/api/messages/conversations');
      const data = await response.json();

      if (response.ok && data.data) {
        const existingConversation = data.data.find((conv: any) =>
          conv.user1Id === profile.user.id || conv.user2Id === profile.user.id
        );

        if (existingConversation) {
          router.push(`/chats/${existingConversation.id}`);
          return;
        }
      }

      const currentUser = currentUserData?.user;
      const isCreatorMessagingFan = currentUser?.role === 'creator' && profile.user.role !== 'creator';
      const messageRate = profile.messageRate || 0;

      if (messageRate > 0 || isCreatorMessagingFan) {
        setIsColdOutreach(isCreatorMessagingFan && messageRate === 0);
        setShowMessageModal(true);
        return;
      }

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
    e.stopPropagation();

    if (!isAuthenticated) {
      setSignUpAction('like content');
      setShowSignUpModal(true);
      return;
    }

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

  const handleSendTip = async (amount: number, message: string, giftId?: string, giftEmoji?: string, giftName?: string) => {
    if (!profile) return;

    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receiverId: profile.user.id,
          message,
          giftId,
          giftEmoji,
          giftName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send gift');
      }

      setTipSuccessAmount(amount);
      setTipSuccessGift(giftEmoji && giftName ? { emoji: giftEmoji, name: giftName } : null);
      setShowTipSuccessModal(true);
    } catch (error) {
      throw error;
    }
  };

  return {
    followLoading,
    handleFollowToggle,
    subscribeLoading,
    handleSubscribe,
    showConfetti,
    showMessageModal,
    setShowMessageModal,
    messageLoading,
    isColdOutreach,
    handleMessage,
    createConversation,
    showTipModal,
    setShowTipModal,
    handleSendTip,
    showTipSuccessModal,
    setShowTipSuccessModal,
    tipSuccessAmount,
    tipSuccessGift,
    selectedVideo,
    setSelectedVideo,
    selectedPhoto,
    setSelectedPhoto,
    contentToUnlock,
    setContentToUnlock,
    handleLikeContent,
    showSignUpModal,
    setShowSignUpModal,
    signUpAction,
    setSignUpAction,
    showSignInModal,
    setShowSignInModal,
    showSignUpFormModal,
    setShowSignUpFormModal,
    requireAuth,
    showSubscribeConfirmModal,
    setShowSubscribeConfirmModal,
    showSubscribeSuccessModal,
    setShowSubscribeSuccessModal,
    showInsufficientFundsModal,
    setShowInsufficientFundsModal,
    insufficientFundsAmount,
    insufficientFundsDetails,
  };
}
