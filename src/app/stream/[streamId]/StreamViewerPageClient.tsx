'use client';

import { useParams, useRouter } from 'next/navigation';
import { StreamChat } from '@/components/streaming/StreamChat';
import { GiftAnimationManager } from '@/components/streaming/GiftAnimation';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { GuestStreamView } from '@/components/streaming/GuestStreamView';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useStreamViewerData } from '@/hooks/useStreamViewerData';
import { useStreamViewerActions } from '@/hooks/useStreamViewerActions';
import { StreamViewerVideoArea, StreamViewerMobileSection, StreamViewerModals } from '@/components/streaming/stream-viewer';
import { useToastContext } from '@/context/ToastContext';
import { X, MessageCircle, Coins, Crown, Ticket } from 'lucide-react';

export default function StreamViewerPageClient() {
  const params = useParams() as { streamId: string };
  const router = useRouter();
  const { showError } = useToastContext();
  const streamId = params.streamId as string;

  const data = useStreamViewerData({ streamId });
  const actions = useStreamViewerActions({
    streamId,
    stream: data.stream,
    isFollowing: data.isFollowing,
    setIsFollowing: data.setIsFollowing,
    followLoading: data.followLoading,
    setFollowLoading: data.setFollowLoading,
    setMessages: data.setMessages,
    fetchUserBalance: data.fetchUserBalance,
  });

  const spotlightedCreator = data.featuredCreators.find(c => c.isSpotlighted) || null;

  // Handle ticket purchase
  const handlePurchaseTicket = async () => {
    if (data.isPurchasingTicket || !data.accessDenied?.ticketPrice) return;
    data.setIsPurchasingTicket(true);
    try {
      const response = await fetch(`/api/streams/${streamId}/ticket`, { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        data.setAccessDenied(null);
        data.fetchStreamDetails();
      } else {
        showError(result.error || 'Failed to purchase ticket');
      }
    } catch {
      showError('Failed to purchase ticket. Please try again.');
    } finally {
      data.setIsPurchasingTicket(false);
    }
  };

  // Handle guest invite accepted
  const handleGuestAccepted = (inviteType: 'video' | 'voice') => {
    data.setIsGuest(true);
    data.setActiveGuest({
      userId: data.currentUserId!,
      username: '',
      displayName: null,
      avatarUrl: null,
      requestType: inviteType,
    });
    data.setGuestInvite(null);
  };

  // Loading state
  if (data.loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center md:pl-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white/60 mt-4">Joining stream...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (data.accessDenied) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 md:pl-20">
        <div className="max-w-md w-full text-center glass rounded-3xl p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-digis-pink/20 to-digis-cyan/20 flex items-center justify-center">
            <span className="text-4xl">{data.accessDenied.requiresTicket ? '🎟️' : '🔒'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            {data.accessDenied.requiresTicket ? 'Ticket Required' : 'Access Required'}
          </h1>
          <p className="text-gray-400 mb-6">{data.accessDenied.reason}</p>

          {data.accessDenied.requiresTicket && data.accessDenied.ticketPrice && (
            <div className="mb-6 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Ticket className="w-6 h-6 text-amber-400" />
                <span className="text-xl font-bold text-amber-400">{data.accessDenied.ticketPrice} coins</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
                <span>Your balance:</span>
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className={data.userBalance >= data.accessDenied.ticketPrice ? 'text-green-400' : 'text-red-400'}>
                  {data.userBalance.toLocaleString()} coins
                </span>
              </div>

              {data.userBalance >= data.accessDenied.ticketPrice ? (
                <GlassButton
                  variant="gradient"
                  size="lg"
                  shimmer
                  glow
                  onClick={handlePurchaseTicket}
                  disabled={data.isPurchasingTicket}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500"
                >
                  {data.isPurchasingTicket ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <><Ticket className="w-5 h-5 mr-2" />Buy Ticket</>
                  )}
                </GlassButton>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-400">You need {data.accessDenied.ticketPrice - data.userBalance} more coins</p>
                  <GlassButton variant="gradient" size="lg" shimmer glow onClick={() => router.push('/wallet')} className="w-full">
                    <Coins className="w-5 h-5 mr-2" />Get Coins
                  </GlassButton>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {data.accessDenied.requiresSubscription && (
              <GlassButton variant="gradient" size="lg" shimmer glow onClick={() => router.push(`/${data.accessDenied!.creatorUsername}`)} className="w-full">
                Subscribe to Watch
              </GlassButton>
            )}
            {data.accessDenied.requiresFollow && (
              <GlassButton variant="gradient" size="lg" shimmer glow onClick={() => router.push(`/${data.accessDenied!.creatorUsername}`)} className="w-full">
                Follow to Watch
              </GlassButton>
            )}
            <GlassButton variant="ghost" size="lg" onClick={() => router.push('/streams')} className="w-full">
              Browse Other Streams
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (data.error || !data.stream) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 md:pl-20">
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-4">{data.error || 'Stream not found'}</h1>
          <GlassButton variant="gradient" onClick={() => router.push('/streams')} shimmer>
            Browse Live Streams
          </GlassButton>
        </div>
      </div>
    );
  }

  const stream = data.stream;

  return (
    <div className="min-h-screen bg-black text-white md:pl-20">
      {/* Guest Stream View */}
      {data.isGuest && data.activeGuest?.userId === data.currentUserId && (
        <GuestStreamView
          streamId={streamId}
          requestType={data.activeGuest.requestType}
          onLeave={() => data.setIsGuest(false)}
        />
      )}

      {/* Floating Emojis Overlay */}
      <GiftFloatingEmojis gifts={data.floatingGifts} onComplete={data.removeFloatingGift} />

      {/* Goal Completed Celebration */}
      {data.completedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{data.completedGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{data.completedGoal.rewardText}</span>
            </div>
          </div>
        </div>
      )}

      {/* Gift Animations Overlay */}
      <GiftAnimationManager gifts={data.giftAnimations} onRemove={data.removeGiftAnimation} />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Video Section */}
        <div className={`${data.isMobile ? 'h-[45vh]' : 'flex-1'} flex flex-col ${actions.showChat && !data.isMobile ? 'lg:mr-[400px]' : ''}`}>
          <StreamViewerVideoArea
            stream={stream}
            streamId={streamId}
            token={data.token}
            serverUrl={data.serverUrl}
            connectionState={data.connectionState}
            showControls={actions.showControls}
            setShowControls={actions.setShowControls}
            showChat={actions.showChat}
            setShowChat={actions.setShowChat}
            isMobile={data.isMobile}
            isMuted={actions.isMuted}
            isFullscreen={actions.isFullscreen}
            isFollowing={data.isFollowing}
            followLoading={data.followLoading}
            viewerCount={data.viewerCount}
            streamEnded={data.streamEnded}
            goals={data.goals}
            activePoll={data.activePoll}
            activeCountdown={data.activeCountdown}
            activeGuest={data.activeGuest}
            spotlightedCreator={spotlightedCreator}
            creatorCallSettings={data.creatorCallSettings}
            videoContainerRef={actions.videoContainerRef}
            onFollowToggle={actions.handleFollowToggle}
            onShareStream={actions.shareStream}
            onToggleMute={actions.toggleMute}
            onToggleFullscreen={actions.toggleFullscreen}
            onShowGiftPanel={() => actions.setShowGiftPanel(true)}
            onShowCallModal={() => actions.setShowCallRequestModal(true)}
            onPollEnded={() => data.setActivePoll(null)}
            onPollVoted={data.fetchPoll}
            onCountdownEnded={() => data.setActiveCountdown(null)}
          />

          {/* Mobile Section */}
          {data.isMobile && (
            <StreamViewerMobileSection
              stream={stream}
              streamId={streamId}
              messages={data.messages}
              currentUserId={data.currentUserId}
              viewerCount={data.viewerCount}
              isFollowing={data.isFollowing}
              followLoading={data.followLoading}
              leaderboard={data.leaderboard}
              spotlightedCreator={spotlightedCreator}
              creatorCallSettings={data.creatorCallSettings}
              onSendMessage={actions.handleSendMessage}
              onFollowToggle={actions.handleFollowToggle}
              onShowGiftPanel={() => actions.setShowGiftPanel(true)}
              onShowCallModal={() => actions.setShowCallRequestModal(true)}
            />
          )}

          {/* Below Video - Desktop Only */}
          {!data.isMobile && (
            <div className="p-4 bg-black/40 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {stream.description && (
                    <p className="text-sm text-gray-400 line-clamp-1 max-w-md">{stream.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-yellow-400">{data.userBalance.toLocaleString()}</span>
                  <span className="text-gray-400 text-sm">coins</span>
                </div>
              </div>

              {data.leaderboard.length > 0 && (
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span>Top Gifters:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {data.leaderboard.slice(0, 5).map((entry, index) => (
                      <div key={entry.senderId} className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                        <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                          #{index + 1}
                        </span>
                        <span className="text-sm text-white">{entry.senderUsername}</span>
                        <span className="text-xs text-digis-cyan">{entry.totalCoins}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Sidebar - Desktop */}
        {actions.showChat && !data.isMobile && (
          <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-black/95 border-l border-white/10 flex flex-col z-40">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-digis-cyan" />
                <span className="font-bold">Live Chat</span>
                <span className="text-xs text-gray-500 bg-white/10 px-2 py-0.5 rounded-full">{data.messages.length}</span>
              </div>
              <button onClick={() => actions.setShowChat(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <StreamChat
                streamId={streamId}
                messages={data.messages}
                onSendMessage={actions.handleSendMessage}
                currentUserId={data.currentUserId || undefined}
              />
            </div>
          </div>
        )}

        {/* Modals */}
        <StreamViewerModals
          stream={stream}
          streamId={streamId}
          userBalance={data.userBalance}
          spotlightedCreator={spotlightedCreator}
          showGiftPanel={actions.showGiftPanel}
          onCloseGiftPanel={() => actions.setShowGiftPanel(false)}
          onSendGift={actions.handleSendGift}
          onSendTip={actions.handleSendTip}
          showCallRequestModal={actions.showCallRequestModal}
          onCloseCallModal={() => actions.setShowCallRequestModal(false)}
          creatorCallSettings={data.creatorCallSettings}
          isRequestingCall={actions.isRequestingCall}
          callRequestError={actions.callRequestError}
          onRequestCall={actions.handleRequestCall}
          guestInvite={data.guestInvite}
          currentUserId={data.currentUserId}
          onGuestAccepted={handleGuestAccepted}
          onGuestDeclined={() => data.setGuestInvite(null)}
          streamEnded={data.streamEnded}
          viewerCount={data.viewerCount}
          peakViewers={data.peakViewers}
        />
      </div>
    </div>
  );
}
