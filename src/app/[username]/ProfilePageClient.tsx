'use client';

import { useParams, useRouter } from 'next/navigation';
import { GlassCard, LoadingSpinner } from '@/components/ui';
import { useToastContext } from '@/context/ToastContext';
import { useProfileData } from '@/hooks/useProfileData';
import { useProfileActions } from '@/hooks/useProfileActions';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { TipModal } from '@/components/messages/TipModal';
import { ContentUnlockModal } from '@/components/content/ContentUnlockModal';
import { SignUpPromptModal } from '@/components/auth/SignUpPromptModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { SignupModal } from '@/components/auth/SignupModal';
import {
  ParallaxBanner,
  ProfileHeaderCard,
  ProfileContentTabs,
  ProfileModals,
  ProfileLiveSection,
  ProfileGoalsWidget,
} from '@/components/profile';
import type { ContentItem } from '@/components/profile/types';

export default function ProfilePageClient() {
  const params = useParams();
  const router = useRouter();
  const { showError, showInfo } = useToastContext();
  const username = params.username as string;

  const data = useProfileData({ username });
  const actions = useProfileActions({
    profile: data.profile,
    isAuthenticated: data.isAuthenticated,
    currentUserId: data.currentUserId,
    isFollowing: data.isFollowing,
    setIsFollowing: data.setIsFollowing,
    isSubscribed: data.isSubscribed,
    setIsSubscribed: data.setIsSubscribed,
    subscriptionTier: data.subscriptionTier,
    setProfile: data.setProfile,
    content: data.content,
    setContent: data.setContent,
    fetchCreatorContent: data.fetchCreatorContent,
  });

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (data.error || !data.profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-gray-400 mb-4">{data.error || 'User does not exist'}</p>
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

  const { profile } = data;
  const { user } = profile;

  const handleContentClick = (item: ContentItem) => {
    if (item.isLocked && !item.isFree && item.unlockPrice > 0) {
      actions.setContentToUnlock({
        id: item.id,
        title: item.title,
        type: item.type,
        unlockPrice: item.unlockPrice,
        thumbnail: item.thumbnail,
        creatorName: profile.user.displayName || profile.user.username || 'Creator',
      });
    } else if (item.type === 'video') {
      actions.setSelectedVideo(item);
    } else {
      actions.setSelectedPhoto(item);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-24 md:pb-8 ${data.isAuthenticated ? 'md:pl-20' : ''} relative overflow-hidden`}>
      <MobileHeader />

      {/* Animated Background Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-48 -left-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] top-1/3 -right-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[400px] h-[400px] bottom-1/4 left-1/3 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <ConfettiEffect show={actions.showConfetti} duration={2000} />

      {/* Spacer for fixed mobile header */}
      <div className="md:hidden" style={{ height: 'calc(48px + env(safe-area-inset-top, 0px))' }} />

      {/* Banner */}
      <div className="relative">
        <ParallaxBanner imageUrl={user.bannerUrl} height={user.bannerUrl ? "h-48 sm:h-64 md:h-96" : "h-40 sm:h-40 md:h-48"} username={user.username} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/90"></div>
      </div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <ProfileHeaderCard
          profile={profile}
          isFollowing={data.isFollowing}
          followLoading={actions.followLoading}
          isSubscribed={data.isSubscribed}
          subscriptionTier={data.subscriptionTier}
          currentUserId={data.currentUserId}
          isAuthenticated={data.isAuthenticated}
          aiTwinEnabled={data.aiTwinEnabled}
          onFollowToggle={actions.handleFollowToggle}
          onSubscribeClick={() => {
            if (!data.isAuthenticated) {
              actions.setSignUpAction('subscribe to this creator');
              actions.setShowSignUpModal(true);
              return;
            }
            actions.setShowSubscribeConfirmModal(true);
          }}
          onMessageClick={actions.handleMessage}
          onTipClick={() => {
            if (!data.isAuthenticated) {
              actions.setSignUpAction('send gifts');
              actions.setShowSignUpModal(true);
              return;
            }
            if (data.currentUserId === user.id) {
              showInfo("You can't gift yourself");
              return;
            }
            actions.setShowTipModal(true);
          }}
          onAiTwinClick={() => {
            if (!data.isAuthenticated) {
              actions.setSignUpAction('chat with AI Twin');
              actions.setShowSignUpModal(true);
              return;
            }
            router.push(`/ai-chat/${user.username}`);
          }}
          onRequireAuth={(action) => {
            actions.setSignUpAction(action);
            actions.setShowSignUpModal(true);
          }}
        />

        {/* Creator Links — near header so fans see them early */}
        {user.role === 'creator' && profile.links && profile.links.length > 0 && (
          <div className="mb-6 -mt-2">
            <div className="grid grid-cols-2 gap-2">
              {profile.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-white/5 to-white/10 hover:from-cyan-500/20 hover:to-purple-500/20 border border-white/10 hover:border-cyan-500/40 rounded-xl transition-all duration-300"
                >
                  <span className="text-lg">{link.emoji || '🔗'}</span>
                  <span className="flex-1 text-sm font-medium text-white truncate group-hover:text-cyan-300 transition-colors">
                    {link.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Live Section */}
        <ProfileLiveSection
          username={user.username}
          isAuthenticated={data.isAuthenticated}
          onRequireAuth={(action: string) => {
            actions.setSignUpAction(action);
            actions.setShowSignUpModal(true);
          }}
        />

        {/* Goals */}
        {user.role === 'creator' && data.goals.length > 0 && (
          <div className="mb-6">
            <ProfileGoalsWidget goals={data.goals} maxDisplay={3} onGoalUpdate={data.fetchGoals} />
          </div>
        )}

        {/* Content Tabs - creators only */}
        {user.role === 'creator' && <ProfileContentTabs
          activeTab={data.activeTab}
          onTabChange={data.setActiveTab}
          streamsSubTab={data.streamsSubTab}
          onStreamsSubTabChange={data.setStreamsSubTab}
          content={data.content}
          streams={data.streams}
          clips={data.clips}
          contentLoading={data.contentLoading}
          hasMoreContent={data.hasMoreContent}
          hasMoreStreams={data.hasMoreStreams}
          loadingMoreContent={data.loadingMoreContent}
          loadingMoreStreams={data.loadingMoreStreams}
          onLoadMoreContent={data.loadMoreContent}
          onLoadMoreVods={data.loadMoreVods}
          user={user}
          isFollowing={data.isFollowing}
          onFollowToggle={actions.handleFollowToggle}
          onContentClick={handleContentClick}
          onLikeContent={actions.handleLikeContent}
        />}
      </div>

      {/* Tip Modal */}
      {actions.showTipModal && profile && (
        <TipModal
          onClose={() => actions.setShowTipModal(false)}
          onSend={actions.handleSendTip}
          receiverName={profile.user.displayName || profile.user.username}
        />
      )}

      {/* Content Unlock Modal */}
      {actions.contentToUnlock && (
        <ContentUnlockModal
          content={actions.contentToUnlock}
          onClose={() => actions.setContentToUnlock(null)}
          onSuccess={() => {
            actions.setContentToUnlock(null);
            data.fetchCreatorContent();
          }}
        />
      )}

      {/* Profile Modals (inline portals) */}
      <ProfileModals
        profile={profile}
        mounted={data.mounted}
        showTipSuccessModal={actions.showTipSuccessModal}
        onCloseTipSuccess={() => actions.setShowTipSuccessModal(false)}
        tipSuccessAmount={actions.tipSuccessAmount}
        tipSuccessGift={actions.tipSuccessGift}
        selectedVideo={actions.selectedVideo}
        onCloseVideo={() => actions.setSelectedVideo(null)}
        selectedPhoto={actions.selectedPhoto}
        onClosePhoto={() => actions.setSelectedPhoto(null)}
        showMessageModal={actions.showMessageModal}
        onCloseMessage={() => actions.setShowMessageModal(false)}
        messageLoading={actions.messageLoading}
        isColdOutreach={actions.isColdOutreach}
        onCreateConversation={actions.createConversation}
        showSubscribeConfirmModal={actions.showSubscribeConfirmModal}
        onCloseSubscribeConfirm={() => actions.setShowSubscribeConfirmModal(false)}
        subscriptionTier={data.subscriptionTier}
        subscribeLoading={actions.subscribeLoading}
        onSubscribe={actions.handleSubscribe}
        showInsufficientFundsModal={actions.showInsufficientFundsModal}
        onCloseInsufficientFunds={() => actions.setShowInsufficientFundsModal(false)}
        insufficientFundsAmount={actions.insufficientFundsAmount}
        insufficientFundsDetails={actions.insufficientFundsDetails}
        showSubscribeSuccessModal={actions.showSubscribeSuccessModal}
        onCloseSubscribeSuccess={() => actions.setShowSubscribeSuccessModal(false)}
      />

      {/* Auth Modals */}
      <SignUpPromptModal
        isOpen={actions.showSignUpModal}
        onClose={() => actions.setShowSignUpModal(false)}
        action={actions.signUpAction}
        creatorName={profile?.user.displayName || profile?.user.username}
        onSignIn={() => actions.setShowSignInModal(true)}
        onSignUp={() => actions.setShowSignUpFormModal(true)}
      />
      <LoginModal
        isOpen={actions.showSignInModal}
        onClose={() => actions.setShowSignInModal(false)}
        onSwitchToSignup={() => {
          actions.setShowSignInModal(false);
          actions.setShowSignUpFormModal(true);
        }}
      />
      <SignupModal
        isOpen={actions.showSignUpFormModal}
        onClose={() => actions.setShowSignUpFormModal(false)}
        onSwitchToLogin={() => {
          actions.setShowSignUpFormModal(false);
          actions.setShowSignInModal(true);
        }}
      />
    </div>
  );
}
