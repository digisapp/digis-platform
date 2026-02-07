'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Volume2, VolumeX, Maximize, Minimize, Users,
  Ticket, Coins, List,
} from 'lucide-react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RequestCallButton } from '@/components/calls/RequestCallButton';
import { FloatingGiftBar } from '@/components/streaming/FloatingGiftBar';
import { SpotlightedCreatorOverlay } from '@/components/streaming/SpotlightedCreatorOverlay';
import { BRBOverlay } from '@/components/live/BRBOverlay';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { StreamPoll } from '@/components/streaming/StreamPoll';
import { StreamCountdown } from '@/components/streaming/StreamCountdown';
import { GuestVideoOverlay } from '@/components/streaming/GuestVideoOverlay';
import { TicketedStreamBlockScreen } from '@/components/streaming/TicketedStreamBlockScreen';
import { StreamErrorBoundary } from '@/components/error-boundaries';
import { getCategoryById, getCategoryIcon } from '@/lib/constants/stream-categories';
import {
  PinnedMenuPreview,
  ViewerChatMessages,
  ViewerChatInput,
  ViewerListPanel,
} from '@/components/streaming/viewer';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  content: string;
  timestamp: number;
  isCreator?: boolean;
  isModerator?: boolean;
  messageType?: 'chat' | 'tip' | 'gift' | 'ticket_purchase' | 'menu_purchase' | 'menu_order' | 'menu_tip';
  tipAmount?: number;
  giftEmoji?: string;
  giftName?: string;
  giftQuantity?: number;
  ticketPrice?: number;
  showTitle?: string;
}

interface ViewerVideoAreaProps {
  stream: any;
  streamId: string;
  token: string | null;
  serverUrl: string | null;
  streamOrientation: string;
  muted: boolean;
  isFullscreen: boolean;
  streamEnded: boolean;
  showBRB: boolean;
  showChat: boolean;
  showViewerList: boolean;
  showUnmutePrompt: boolean;
  displayViewerCount: number;
  currentUser: any;
  userBalance: number;
  // Chat
  messages: ChatMessage[];
  displayMessages: ChatMessage[];
  messageInput: string;
  sendingMessage: boolean;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  // Menu
  menuEnabled: boolean;
  menuItems: any[];
  // Overlays
  activePoll: any;
  activeCountdown: any;
  activeGuest: any;
  // Ticketed
  ticketedModeActive: boolean;
  hasTicket: boolean;
  ticketedShowInfo: any;
  purchasingTicket: boolean;
  upcomingTicketedShow: any;
  dismissedTicketedStream: any;
  ticketedAnnouncement: any;
  hasPurchasedUpcomingTicket: boolean;
  ticketCountdown: string | null;
  // Viewer list
  viewers: any[];
  leaderboard: any[];
  // Handlers
  toggleMute: () => void;
  toggleFullscreen: () => void;
  sendMessage: () => void;
  handleSendGift: (giftId: string, quantity: number) => Promise<void>;
  handleInstantTicketPurchase: () => void;
  handleBroadcasterLeft: () => void;
  onSetMessageInput: (v: string) => void;
  onSetShowViewerList: (v: boolean) => void;
  onSetShowTipModal: (v: boolean) => void;
  onSetShowMenuModal: (v: boolean) => void;
  onSetShowBuyCoinsModal: (v: boolean) => void;
  onSetStreamEnded: (v: boolean) => void;
  onSetActivePoll: (v: any) => void;
  onSetActiveCountdown: (v: any) => void;
  onSetQuickBuyInfo: (v: any) => void;
  onSetShowQuickBuyModal: (v: boolean) => void;
  fetchPoll: () => void;
  // ViewerVideo component
  ViewerVideo: React.ComponentType<{ onBroadcasterLeft?: () => void }>;
}

export function ViewerVideoArea({
  stream,
  streamId,
  token,
  serverUrl,
  streamOrientation,
  muted,
  isFullscreen,
  streamEnded,
  showBRB,
  showChat,
  showViewerList,
  showUnmutePrompt,
  displayViewerCount,
  currentUser,
  userBalance,
  messages,
  displayMessages,
  messageInput,
  sendingMessage,
  chatContainerRef,
  menuEnabled,
  menuItems,
  activePoll,
  activeCountdown,
  activeGuest,
  ticketedModeActive,
  hasTicket,
  ticketedShowInfo,
  purchasingTicket,
  upcomingTicketedShow,
  dismissedTicketedStream,
  ticketedAnnouncement,
  hasPurchasedUpcomingTicket,
  ticketCountdown,
  viewers,
  leaderboard,
  toggleMute,
  toggleFullscreen,
  sendMessage,
  handleSendGift,
  handleInstantTicketPurchase,
  handleBroadcasterLeft,
  onSetMessageInput,
  onSetShowViewerList,
  onSetShowTipModal,
  onSetShowMenuModal,
  onSetShowBuyCoinsModal,
  onSetStreamEnded,
  onSetActivePoll,
  onSetActiveCountdown,
  onSetQuickBuyInfo,
  onSetShowQuickBuyModal,
  fetchPoll,
  ViewerVideo,
}: ViewerVideoAreaProps) {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Video Player Area */}
      <div className={`flex flex-col bg-gradient-to-b from-black via-gray-900 to-black min-h-0 lg:flex-1 ${streamOrientation === 'portrait' ? 'items-center' : ''}`}>
        {/* Video */}
        <div className={`relative ${
          streamOrientation === 'portrait'
            ? 'aspect-[9/16] max-h-[85dvh] w-auto mx-auto'
            : 'aspect-video landscape:aspect-auto landscape:max-h-[55dvh] lg:aspect-auto lg:flex-1 lg:min-h-[75dvh] w-full'
        }`}>
          {streamEnded ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-6">Stream has ended</h2>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push(`/${stream?.creator.username}`)}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:scale-105 transition-all"
                  >
                    View Creator Profile
                  </button>
                  <button
                    onClick={() => router.push('/watch')}
                    className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                  >
                    Browse Live Streams
                  </button>
                </div>
              </div>
            </div>
          ) : token && serverUrl ? (
            <>
              <StreamErrorBoundary streamId={streamId} creatorName={stream?.creator.displayName || stream?.creator.username} onLeave={() => router.push('/')}>
                <LiveKitRoom
                  token={token}
                  serverUrl={serverUrl}
                  className="h-full"
                  options={{
                    adaptiveStream: { pixelDensity: 'screen' },
                    dynacast: true,
                  }}
                >
                  <ViewerVideo onBroadcasterLeft={handleBroadcasterLeft} />
                  <RoomAudioRenderer muted={muted} />
                </LiveKitRoom>
              </StreamErrorBoundary>
              {showBRB && (
                <BRBOverlay
                  streamId={streamId}
                  creatorName={stream?.creator?.displayName || stream?.creator?.username || 'Creator'}
                  isTicketed={stream?.privacy === 'private'}
                  onStreamEnded={() => onSetStreamEnded(true)}
                />
              )}
              <SpotlightedCreatorOverlay streamId={streamId} isHost={false} />
              {activeGuest && (
                <GuestVideoOverlay
                  guestUserId={activeGuest.userId}
                  guestUsername={activeGuest.username}
                  guestDisplayName={activeGuest.displayName}
                  guestAvatarUrl={activeGuest.avatarUrl}
                  requestType={activeGuest.requestType}
                  isHost={false}
                />
              )}
              {activePoll && activePoll.isActive && (
                <div className="absolute bottom-12 left-3 z-40 w-[180px] sm:w-[260px]">
                  <StreamPoll
                    poll={activePoll}
                    isBroadcaster={false}
                    streamId={streamId}
                    onPollEnded={() => onSetActivePoll(null)}
                    onVoted={fetchPoll}
                  />
                </div>
              )}
              {activeCountdown && activeCountdown.isActive && (
                <div className="absolute bottom-20 right-3 z-40 w-[180px]">
                  <StreamCountdown
                    countdown={activeCountdown}
                    isBroadcaster={false}
                    streamId={streamId}
                    onCountdownEnded={() => onSetActiveCountdown(null)}
                  />
                </div>
              )}
              {ticketedModeActive && !hasTicket && ticketedShowInfo && (
                <TicketedStreamBlockScreen
                  ticketedShowInfo={ticketedShowInfo}
                  purchasingTicket={purchasingTicket}
                  userBalance={userBalance}
                  currentUser={currentUser}
                  onPurchase={handleInstantTicketPurchase}
                  onBuyCoins={() => onSetShowBuyCoinsModal(true)}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="text-white/60 mt-4">Loading stream...</p>
              </div>
            </div>
          )}

          {/* Mobile Unmute Prompt */}
          {muted && showUnmutePrompt && !streamEnded && token && (
            <button
              onClick={toggleMute}
              className="lg:hidden absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-300"
            >
              <div className="flex flex-col items-center gap-3 px-6 py-4 bg-black/80 rounded-2xl border border-white/20 shadow-2xl">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                  <VolumeX className="w-7 h-7 text-white" />
                </div>
                <span className="text-white font-semibold text-lg">Tap to Unmute</span>
                <span className="text-white/60 text-sm">Sound is muted</span>
              </div>
            </button>
          )}

          {/* Video Controls Overlay - desktop only */}
          <div className="hidden lg:block absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg glass-dark hover:bg-white/20 transition-all shadow-lg hover:shadow-cyan-500/20 hover:scale-110"
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                >
                  {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
              </div>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg glass-dark hover:bg-white/20 transition-all shadow-lg hover:shadow-cyan-500/20 hover:scale-110"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Stream Info Bar */}
        <div className="px-3 lg:pl-6 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)]">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-pink-100 bg-clip-text text-transparent truncate">{stream.title}</h2>
            {stream.category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-xs text-cyan-300 flex-shrink-0">
                <span>{getCategoryIcon(stream.category)}</span>
                <span>{getCategoryById(stream.category)?.name || stream.category}</span>
              </span>
            )}
            {stream.tags && stream.tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                {stream.tags.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {stream.description && (
            <p className="text-xs text-white/80 truncate hidden sm:block mt-1">{stream.description}</p>
          )}
        </div>

        {/* Goal Bar */}
        {stream && stream.goals && stream.goals.length > 0 && !streamEnded && stream.goals.some((g: any) => g.isActive && !g.isCompleted) && (
          <div className="px-3 lg:px-4 lg:pl-6 py-2">
            <TronGoalBar
              goals={stream.goals
                .filter((g: any) => g.isActive && !g.isCompleted)
                .map((g: any) => ({
                  id: g.id,
                  title: g.title || 'Stream Goal',
                  description: g.description,
                  rewardText: g.rewardText,
                  targetAmount: g.targetAmount,
                  currentAmount: g.currentAmount,
                }))}
            />
          </div>
        )}

        {/* Mobile Action Bar */}
        {!streamEnded && (
          <div className="lg:hidden px-3 py-2 glass-dark border-t border-cyan-400/20 overflow-visible">
            <div className="flex items-center gap-3 overflow-visible">
              {currentUser && (
                <button
                  onClick={() => onSetShowTipModal(true)}
                  className="relative min-w-[44px] min-h-[44px] p-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black rounded-xl shadow-lg shadow-cyan-500/30 flex-shrink-0 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Coins className="w-5 h-5" />
                  {menuEnabled && menuItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-pink-500 rounded-full animate-pulse border-2 border-black" />
                  )}
                </button>
              )}
              {stream.creatorCallSettings && currentUser && stream.goPrivateEnabled !== false && (
                <div className="flex-shrink-0">
                  <RequestCallButton
                    creatorId={stream.creator.id}
                    creatorName={stream.creator.displayName || stream.creator.username}
                    ratePerMinute={stream.goPrivateRate ?? stream.creatorCallSettings.callRatePerMinute}
                    minimumDuration={stream.goPrivateMinDuration ?? stream.creatorCallSettings.minimumCallDuration}
                    isAvailable={stream.creatorCallSettings.isAvailableForCalls}
                    callType="video"
                    iconOnly
                  />
                </div>
              )}
              <div className="flex-1 relative z-50">
                <FloatingGiftBar
                  streamId={streamId}
                  creatorId={stream.creator.id}
                  onSendGift={handleSendGift}
                  userBalance={userBalance}
                  isAuthenticated={!!currentUser}
                  onAuthRequired={() => router.push(`/login?redirect=/live/${streamId}`)}
                  onBuyCoins={() => onSetShowBuyCoinsModal(true)}
                  inline
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Chat Section */}
        <div className="lg:hidden flex-1 flex flex-col min-h-0 bg-black/40">
          {menuEnabled && menuItems.length > 0 && (
            <PinnedMenuPreview menuItems={menuItems} onOpenMenu={() => onSetShowMenuModal(true)} variant="mobile" />
          )}
          <ViewerChatMessages messages={displayMessages} chatContainerRef={chatContainerRef as React.RefObject<HTMLDivElement>} variant="mobile" />
          <ViewerChatInput
            messageInput={messageInput}
            onMessageChange={onSetMessageInput}
            onSend={sendMessage}
            sendingMessage={sendingMessage}
            currentUser={currentUser}
            userBalance={userBalance}
            ticketedModeActive={ticketedModeActive}
            hasTicket={hasTicket}
            onBuyCoins={() => onSetShowBuyCoinsModal(true)}
            onLogin={() => router.push(`/login?redirect=/live/${streamId}`)}
            variant="mobile"
          />
        </div>

        {/* Desktop Action Buttons Bar */}
        <div className="hidden lg:flex px-4 lg:pl-6 py-2 glass-dark border-t border-cyan-400/20 backdrop-blur-xl shadow-[0_-2px_15px_rgba(34,211,238,0.1)] items-center justify-start gap-3 overflow-visible">
          <button
            onClick={() => onSetShowTipModal(true)}
            disabled={!currentUser}
            className="relative px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-300/50 flex items-center gap-2 flex-shrink-0"
          >
            <Coins className="w-4 h-4" />
            <span>Send Tip</span>
            {menuEnabled && menuItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full animate-pulse" />
            )}
          </button>

          {stream.creatorCallSettings && stream.goPrivateEnabled !== false && (
            <div className="flex-shrink-0">
              <RequestCallButton
                creatorId={stream.creator.id}
                creatorName={stream.creator.displayName || stream.creator.username}
                ratePerMinute={stream.goPrivateRate ?? stream.creatorCallSettings.callRatePerMinute}
                minimumDuration={stream.goPrivateMinDuration ?? stream.creatorCallSettings.minimumCallDuration}
                isAvailable={stream.creatorCallSettings.isAvailableForCalls}
                callType="video"
              />
            </div>
          )}

          {menuEnabled && menuItems.length > 0 && (
            <button
              onClick={() => onSetShowMenuModal(true)}
              disabled={!currentUser}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] disabled:opacity-50 disabled:cursor-not-allowed border border-pink-300/50 flex items-center gap-2 flex-shrink-0"
            >
              <List className="w-4 h-4" />
              <span>Menu</span>
            </button>
          )}

          {(upcomingTicketedShow || dismissedTicketedStream) && !ticketedAnnouncement && !hasPurchasedUpcomingTicket && (
            <button
              onClick={() => {
                const showId = upcomingTicketedShow?.id || dismissedTicketedStream?.ticketedStreamId;
                const title = upcomingTicketedShow?.title || dismissedTicketedStream?.title || 'Private Stream';
                const price = upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice || 0;
                if (showId) {
                  onSetQuickBuyInfo({ showId, title, price });
                  onSetShowQuickBuyModal(true);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-300/50 flex items-center gap-2 flex-shrink-0"
            >
              <Ticket className="w-4 h-4" />
              <span>Get Ticket</span>
              <Coins className="w-3 h-3 text-amber-800" />
              <span className="text-amber-800">{upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice}</span>
              {ticketCountdown && (
                <span className="text-amber-900 text-xs ml-1">• {ticketCountdown}</span>
              )}
            </button>
          )}

          {stream && !streamEnded && (
            <div className="flex-1 relative overflow-visible">
              <FloatingGiftBar
                streamId={streamId}
                creatorId={stream.creator.id}
                onSendGift={handleSendGift}
                userBalance={userBalance}
                isAuthenticated={!!currentUser}
                onAuthRequired={() => router.push(`/login?redirect=/live/${streamId}`)}
                onBuyCoins={() => onSetShowBuyCoinsModal(true)}
                inline
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Chat & Viewers (Desktop only) */}
      {showChat && (
        <div className="hidden lg:flex w-[340px] glass-dark border-l border-cyan-400/30 flex-col backdrop-blur-2xl shadow-[-4px_0_30px_rgba(34,211,238,0.15)]">
          <div className="flex border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/5 to-pink-500/5">
            <button
              onClick={() => onSetShowViewerList(false)}
              className={`flex-1 px-4 py-3 font-bold transition-all ${
                !showViewerList
                  ? 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-b-2 border-cyan-400 shadow-[0_2px_15px_rgba(34,211,238,0.3)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => onSetShowViewerList(true)}
              className={`flex-1 px-4 py-3 font-bold transition-all ${
                showViewerList
                  ? 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-white border-b-2 border-cyan-400 shadow-[0_2px_15px_rgba(34,211,238,0.3)]'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                <span>{displayViewerCount}</span>
              </div>
            </button>
          </div>

          {!showViewerList && (
            <>
              {menuEnabled && menuItems.length > 0 && (
                <PinnedMenuPreview menuItems={menuItems} onOpenMenu={() => onSetShowMenuModal(true)} variant="desktop" />
              )}
              <ViewerChatMessages messages={messages} chatContainerRef={chatContainerRef as React.RefObject<HTMLDivElement>} variant="desktop" />
              <ViewerChatInput
                messageInput={messageInput}
                onMessageChange={onSetMessageInput}
                onSend={sendMessage}
                sendingMessage={sendingMessage}
                currentUser={currentUser}
                userBalance={userBalance}
                ticketedModeActive={ticketedModeActive}
                hasTicket={hasTicket}
                onBuyCoins={() => onSetShowBuyCoinsModal(true)}
                onLogin={() => router.push(`/login?redirect=/live/${streamId}`)}
                variant="desktop"
              />
            </>
          )}

          {showViewerList && (
            <ViewerListPanel viewers={viewers} leaderboard={leaderboard} />
          )}
        </div>
      )}
    </div>
  );
}
