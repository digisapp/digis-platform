'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, Coins } from 'lucide-react';
import { GiftFloatingEmojis } from '@/components/streaming/GiftFloatingEmojis';
import { TronGoalBar } from '@/components/streaming/TronGoalBar';
import { TipModal } from '@/components/streaming/TipModal';
import { MenuModal } from '@/components/streaming/MenuModal';
import { BuyCoinsModal } from '@/components/wallet/BuyCoinsModal';
import {
  StreamEndedOverlay,
  TicketAnnouncementModal,
  QuickBuyTicketModal,
  DigitalDownloadModal,
} from '@/components/streaming/viewer';

interface FloatingGift {
  id: string;
  emoji: string;
  rarity: string;
  timestamp: number;
  giftName?: string;
}

interface ViewerFloatingElementsProps {
  stream: any;
  streamId: string;
  streamEnded: boolean;
  currentUser: any;
  userBalance: number;
  // Floating gifts
  floatingGifts: FloatingGift[];
  removeFloatingGift: (id: string) => void;
  // Goal celebration
  celebratingGoal: { title: string; rewardText: string } | null;
  completedGoalsQueue: any[];
  // Ticketed
  ticketedAnnouncement: any;
  showTicketPurchaseSuccess: boolean;
  upcomingTicketedShow: any;
  dismissedTicketedStream: any;
  hasPurchasedUpcomingTicket: boolean;
  ticketCountdown: string | null;
  quickBuyLoading: boolean;
  showQuickBuyModal: boolean;
  quickBuyInfo: any;
  // Modals
  showTipModal: boolean;
  showMenuModal: boolean;
  showBuyCoinsModal: boolean;
  menuEnabled: boolean;
  menuItems: any[];
  // Digital download
  digitalDownload: { show: boolean; url: string; itemLabel: string; amount: number } | null;
  // Handlers
  handleTip: (amount: number, note?: string, tipMenuItem?: { id: string; label: string } | null) => Promise<void>;
  handleQuickBuyTicket: (showId: string, price: number) => Promise<void>;
  loadCurrentUser: () => void;
  onSetShowTipModal: (v: boolean) => void;
  onSetShowMenuModal: (v: boolean) => void;
  onSetShowBuyCoinsModal: (v: boolean) => void;
  onSetDigitalDownload: (v: any) => void;
  onSetTicketedAnnouncement: (v: any) => void;
  onSetDismissedTicketedStream: (v: any) => void;
  onSetShowQuickBuyModal: (v: boolean) => void;
  onSetQuickBuyInfo: (v: any) => void;
}

export function ViewerFloatingElements({
  stream,
  streamId,
  streamEnded,
  currentUser,
  userBalance,
  floatingGifts,
  removeFloatingGift,
  celebratingGoal,
  completedGoalsQueue,
  ticketedAnnouncement,
  showTicketPurchaseSuccess,
  upcomingTicketedShow,
  dismissedTicketedStream,
  hasPurchasedUpcomingTicket,
  ticketCountdown,
  quickBuyLoading,
  showQuickBuyModal,
  quickBuyInfo,
  showTipModal,
  showMenuModal,
  showBuyCoinsModal,
  menuEnabled,
  menuItems,
  digitalDownload,
  handleTip,
  handleQuickBuyTicket,
  loadCurrentUser,
  onSetShowTipModal,
  onSetShowMenuModal,
  onSetShowBuyCoinsModal,
  onSetDigitalDownload,
  onSetTicketedAnnouncement,
  onSetDismissedTicketedStream,
  onSetShowQuickBuyModal,
  onSetQuickBuyInfo,
}: ViewerFloatingElementsProps) {
  const router = useRouter();

  return (
    <>
      {/* Mobile Goal Bar - floating at top */}
      {stream && stream.goals && stream.goals.length > 0 && !streamEnded && stream.goals.some((g: any) => g.isActive && !g.isCompleted) && (
        <div className="lg:hidden fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[55%] max-w-[220px]">
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

      {/* Stream Ended Full-Screen Overlay */}
      {streamEnded && (
        <StreamEndedOverlay
          creatorUsername={stream?.creator.username || ''}
          onNavigate={(path) => router.push(path)}
        />
      )}

      {/* Floating Gift Emojis Animation */}
      <GiftFloatingEmojis gifts={floatingGifts} onComplete={removeFloatingGift} />

      {/* Goal Completed Celebration */}
      {celebratingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl rounded-2xl border-2 border-green-500 p-6 text-center animate-bounce shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">GOAL REACHED!</h2>
            <p className="text-xl text-white font-bold mb-2">{celebratingGoal.title}</p>
            <div className="flex items-center justify-center gap-2 text-pink-400">
              <span className="text-2xl">🎁</span>
              <span className="text-lg">{celebratingGoal.rewardText}</span>
            </div>
            {completedGoalsQueue.length > 0 && (
              <div className="mt-3 text-sm text-gray-400">
                +{completedGoalsQueue.length} more goal{completedGoalsQueue.length > 1 ? 's' : ''} unlocked!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Purchase Success Toast */}
      {showTicketPurchaseSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-slideDown">
          <div className="px-6 py-4 bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-xl rounded-2xl border border-green-400/50 shadow-[0_0_30px_rgba(34,197,94,0.5)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Ticket Purchased!</p>
              <p className="text-white/80 text-sm">You have access when the stream starts</p>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Ticket Button - mobile */}
      {(upcomingTicketedShow || dismissedTicketedStream) && !ticketedAnnouncement && !showQuickBuyModal && !hasPurchasedUpcomingTicket && (
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
          className="lg:hidden fixed top-20 right-3 z-50 px-3 py-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-400 hover:via-yellow-400 hover:to-amber-400 rounded-xl font-bold text-black text-xs transition-all hover:scale-105 shadow-lg shadow-amber-500/40 flex flex-col items-center"
        >
          <div className="flex items-center gap-1">
            <Ticket className="w-3 h-3" />
            <Coins className="w-3 h-3 text-amber-800" />
            <span className="text-amber-800">{upcomingTicketedShow?.ticketPrice || dismissedTicketedStream?.ticketPrice}</span>
          </div>
          {ticketCountdown && (
            <div className="text-[10px] text-amber-900 font-medium">
              {ticketCountdown}
            </div>
          )}
        </button>
      )}

      {/* Tip Modal */}
      {showTipModal && (
        <TipModal
          creatorUsername={stream?.creator.username || ''}
          userBalance={userBalance}
          onSendTip={(amount, note) => handleTip(amount, note, null)}
          onClose={() => onSetShowTipModal(false)}
        />
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <MenuModal
          creatorUsername={stream?.creator.username || ''}
          userBalance={userBalance}
          menuItems={menuItems}
          onPurchase={(price, note, item) => handleTip(price, note, item)}
          onClose={() => onSetShowMenuModal(false)}
          onBuyCoins={() => onSetShowBuyCoinsModal(true)}
        />
      )}

      {/* Ticketed Show Announcement Popup */}
      {ticketedAnnouncement && (
        <TicketAnnouncementModal
          announcement={ticketedAnnouncement}
          userBalance={userBalance}
          currentUser={currentUser}
          quickBuyLoading={quickBuyLoading}
          onPurchase={handleQuickBuyTicket}
          onDismiss={(dismissed) => {
            onSetDismissedTicketedStream(dismissed);
            onSetTicketedAnnouncement(null);
          }}
          onBuyCoins={() => onSetShowBuyCoinsModal(true)}
        />
      )}

      {/* Quick Buy Modal */}
      {showQuickBuyModal && quickBuyInfo && (
        <QuickBuyTicketModal
          quickBuyInfo={quickBuyInfo}
          ticketCountdown={ticketCountdown}
          userBalance={userBalance}
          currentUser={currentUser}
          quickBuyLoading={quickBuyLoading}
          onPurchase={handleQuickBuyTicket}
          onClose={() => {
            onSetShowQuickBuyModal(false);
            onSetQuickBuyInfo(null);
          }}
          onBuyCoins={() => onSetShowBuyCoinsModal(true)}
        />
      )}

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        isOpen={showBuyCoinsModal}
        onClose={() => onSetShowBuyCoinsModal(false)}
        onSuccess={() => {
          loadCurrentUser();
          onSetShowBuyCoinsModal(false);
        }}
      />

      {/* Digital Download Confirmation Modal */}
      {digitalDownload?.show && (
        <DigitalDownloadModal
          digitalDownload={digitalDownload}
          onClose={() => onSetDigitalDownload(null)}
        />
      )}
    </>
  );
}
