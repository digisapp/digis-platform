'use client';

import { useEffect } from 'react';
import { useStreamChat } from '@/hooks/useStreamChat';
import { MAX_CHAT_MESSAGES } from '@/hooks/useBroadcasterData';
import type { StreamMessage, StreamGoal } from '@/db/schema';

interface FloatingGift {
  id: string;
  emoji: string;
  rarity: string;
  timestamp: number;
  giftName?: string;
}

interface UseBroadcasterAblyHandlersParams {
  streamId: string;
  setMessages: React.Dispatch<React.SetStateAction<StreamMessage[]>>;
  setTotalEarnings: React.Dispatch<React.SetStateAction<number>>;
  setFloatingGifts: React.Dispatch<React.SetStateAction<FloatingGift[]>>;
  setViewerCount: React.Dispatch<React.SetStateAction<number>>;
  setPeakViewers: React.Dispatch<React.SetStateAction<number>>;
  setActivePoll: React.Dispatch<React.SetStateAction<{
    id: string;
    question: string;
    options: string[];
    voteCounts: number[];
    totalVotes: number;
    endsAt: string;
    isActive: boolean;
  } | null>>;
  setActiveCountdown: React.Dispatch<React.SetStateAction<{
    id: string;
    label: string;
    endsAt: string;
    isActive: boolean;
  } | null>>;
  setVipModeActive: React.Dispatch<React.SetStateAction<boolean>>;
  setAnnouncedTicketedStream: (s: {
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: Date;
  } | null) => void;
  setActiveGuest: React.Dispatch<React.SetStateAction<{
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    requestType: 'video' | 'voice';
  } | null>>;
  fetchGoals: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchPoll: () => Promise<void>;
  fetchCountdown: () => Promise<void>;
  addCompletedGoal: (goal: { id: string; title: string; rewardText: string }) => void;
  showSuccess: (msg: string) => void;
}

export function useBroadcasterAblyHandlers({
  streamId,
  setMessages,
  setTotalEarnings,
  setFloatingGifts,
  setViewerCount,
  setPeakViewers,
  setActivePoll,
  setActiveCountdown,
  setVipModeActive,
  setAnnouncedTicketedStream,
  setActiveGuest,
  fetchGoals,
  fetchLeaderboard,
  fetchPoll,
  fetchCountdown,
  addCompletedGoal,
  showSuccess,
}: UseBroadcasterAblyHandlersParams) {
  const { viewerCount: ablyViewerCount } = useStreamChat({
    streamId,
    isHost: true,
    onMessage: (message) => {
      const msgData = message as any;
      const streamMessage = {
        id: msgData.id,
        streamId: msgData.streamId || streamId,
        userId: msgData.userId,
        username: msgData.username,
        message: msgData.message || msgData.content || '',
        messageType: msgData.messageType || 'chat',
        giftId: msgData.giftId || null,
        giftAmount: msgData.giftAmount || null,
        giftName: msgData.giftName || null,
        giftEmoji: msgData.giftEmoji || null,
        giftQuantity: msgData.giftQuantity || null,
        tipMenuItemId: msgData.tipMenuItemId || null,
        tipMenuItemLabel: msgData.tipMenuItemLabel || null,
        createdAt: msgData.createdAt ? new Date(msgData.createdAt) : new Date(),
        user: msgData.user,
      } as unknown as StreamMessage;

      if (msgData.messageType === 'ticket_purchase') {
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }

      setMessages((prev) => {
        if (prev.some(m => m.id === streamMessage.id)) {
          return prev;
        }
        const next = [...prev, streamMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
    },
    onGift: (giftEvent) => {
      setTotalEarnings((prev) => prev + (giftEvent.streamGift.quantity || 1) * (giftEvent.gift.coinCost || 0));
      if (giftEvent.gift) {
        setFloatingGifts(prev => {
          const newGift = {
            id: `gift-${Date.now()}-${Math.random()}`,
            emoji: giftEvent.gift.emoji,
            rarity: giftEvent.gift.rarity,
            timestamp: Date.now(),
            giftName: giftEvent.gift.name,
          };
          const updated = [...prev, newGift];
          return updated.length > 50 ? updated.slice(-50) : updated;
        });
      }
      const giftMessage = {
        id: `gift-${Date.now()}`,
        streamId,
        userId: giftEvent.streamGift.senderId,
        username: giftEvent.streamGift.senderUsername,
        message: `sent ${giftEvent.streamGift.quantity > 1 ? giftEvent.streamGift.quantity + 'x ' : ''}${giftEvent.gift.emoji} ${giftEvent.gift.name}`,
        messageType: 'gift' as const,
        giftId: giftEvent.gift.id,
        giftAmount: giftEvent.streamGift.quantity * giftEvent.gift.coinCost,
        giftEmoji: giftEvent.gift.emoji,
        giftName: giftEvent.gift.name,
        giftQuantity: giftEvent.streamGift.quantity,
        tipMenuItemId: null,
        tipMenuItemLabel: null,
        user: { avatarUrl: giftEvent.streamGift.senderAvatarUrl || null },
        createdAt: new Date(),
      };
      setMessages((prev) => {
        const next = [...prev, giftMessage as unknown as StreamMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
      fetchGoals();
      fetchLeaderboard();
    },
    onTip: (tipData) => {
      setTotalEarnings((prev) => prev + tipData.amount);
      fetchLeaderboard();

      let content = `tipped ${tipData.amount} coins!`;
      let messageType: 'tip' | 'menu_purchase' | 'menu_order' | 'menu_tip' | 'super_tip' = 'tip';
      let emoji = '💰';

      if (tipData.menuItemLabel) {
        if (tipData.itemCategory === 'product' || tipData.fulfillmentType === 'digital') {
          content = `📥 purchased "${tipData.menuItemLabel}" for ${tipData.amount} coins`;
          messageType = 'menu_purchase';
          emoji = '📦';
        } else if (tipData.fulfillmentType === 'manual' || tipData.itemCategory === 'service') {
          content = `💌 ordered "${tipData.menuItemLabel}" for ${tipData.amount} coins`;
          messageType = 'menu_order';
          emoji = '📝';
        } else {
          content = `⭐ sent ${tipData.amount} coins for "${tipData.menuItemLabel}"`;
          messageType = 'menu_tip';
          emoji = '⭐';
        }
      }

      if (tipData.message) {
        messageType = 'super_tip';
        emoji = '💬';
      }

      const tipMessage = {
        id: `tip-${Date.now()}-${Math.random()}`,
        streamId,
        userId: tipData.senderId,
        username: tipData.senderUsername,
        message: content,
        messageType: messageType as any,
        giftAmount: tipData.amount,
        tipMessage: tipData.message || null,
        createdAt: new Date(),
        user: {
          avatarUrl: tipData.senderAvatarUrl || null,
        },
      } as unknown as StreamMessage;
      setMessages((prev) => {
        const next = [...prev, tipMessage];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });

      setFloatingGifts(prev => {
        const newTip = {
          id: `tip-${Date.now()}-${Math.random()}`,
          emoji,
          rarity: tipData.amount >= 100 ? 'epic' : tipData.amount >= 50 ? 'rare' : 'common',
          timestamp: Date.now(),
        };
        const updated = [...prev, newTip];
        return updated.length > 50 ? updated.slice(-50) : updated;
      });
    },
    onViewerCount: (data) => {
      setViewerCount(data.currentViewers);
      setPeakViewers(data.peakViewers);
    },
    onViewerJoined: () => {
      const audio = new Audio('/sounds/new-viewer.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    },
    onGoalUpdate: (update) => {
      fetchGoals();
      if (update.action === 'completed' && update.goal) {
        addCompletedGoal({
          id: update.goal.id || `goal-${Date.now()}`,
          title: update.goal.title || 'Stream Goal',
          rewardText: update.goal.rewardText || 'Goal reached!',
        });
      }
    },
    onPollUpdate: (event) => {
      if (event.action === 'ended') {
        setActivePoll(null);
      } else {
        fetchPoll();
      }
    },
    onCountdownUpdate: (event) => {
      if (event.action === 'ended' || event.action === 'cancelled') {
        setActiveCountdown(null);
      } else {
        fetchCountdown();
      }
    },
    onTicketedAnnouncement: (event) => {
      setAnnouncedTicketedStream({
        id: event.ticketedStreamId,
        title: event.title,
        ticketPrice: event.ticketPrice,
        startsAt: new Date(event.startsAt),
      });
    },
    onVipModeChange: (event) => {
      setVipModeActive(event.isActive);
      if (event.isActive) {
        showSuccess('VIP show started!');
      }
    },
    onGuestJoined: (event) => {
      setActiveGuest({
        userId: event.userId,
        username: event.username,
        displayName: event.displayName,
        avatarUrl: null,
        requestType: event.requestType,
      });
      showSuccess(`${event.username} has joined as a guest!`);
    },
    onGuestRemoved: () => {
      setActiveGuest(null);
    },
  });

  // Update viewer count from Ably presence
  useEffect(() => {
    if (ablyViewerCount > 0) {
      setViewerCount(ablyViewerCount);
    }
  }, [ablyViewerCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeFloatingGift = (id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
  };

  return { removeFloatingGift };
}
