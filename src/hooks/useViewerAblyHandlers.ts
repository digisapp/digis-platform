'use client';

import { useCallback } from 'react';
import { useStreamChat } from '@/hooks/useStreamChat';

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

interface FloatingGift {
  id: string;
  emoji: string;
  rarity: string;
  timestamp: number;
  giftName?: string;
}

interface UseViewerAblyHandlersParams {
  streamId: string;
  stream: any;
  currentUser: any;
  setStream: React.Dispatch<React.SetStateAction<any>>;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setFloatingGifts: React.Dispatch<React.SetStateAction<FloatingGift[]>>;
  loadStream: () => void;
  addCompletedGoal: (goal: { id: string; title: string; rewardText: string }) => void;
  setStreamEnded: (v: boolean) => void;
  setTicketedAnnouncement: (v: any) => void;
  checkTicketAccess: () => void;
  abortPendingTicketCheck: () => void;
  setTicketedModeActive: (v: boolean) => void;
  setTicketedShowInfo: (v: any) => void;
  setHasTicket: (v: boolean) => void;
  setHasPurchasedUpcomingTicket: (v: boolean) => void;
  setDismissedTicketedStream: (v: any) => void;
  setUpcomingTicketedShow: (v: any) => void;
  setMenuEnabled: (v: boolean) => void;
  setMenuItems: (items: any[]) => void;
  menuItems: any[];
  setActivePoll: (v: any) => void;
  setActiveCountdown: (v: any) => void;
  setActiveGuest: (v: any) => void;
  fetchPoll: () => void;
  fetchCountdown: () => void;
  MAX_CHAT_MESSAGES: number;
}

export function useViewerAblyHandlers({
  streamId,
  stream,
  currentUser,
  setStream,
  setMessages,
  setFloatingGifts,
  loadStream,
  addCompletedGoal,
  setStreamEnded,
  setTicketedAnnouncement,
  checkTicketAccess,
  abortPendingTicketCheck,
  setTicketedModeActive,
  setTicketedShowInfo,
  setHasTicket,
  setHasPurchasedUpcomingTicket,
  setDismissedTicketedStream,
  setUpcomingTicketedShow,
  setMenuEnabled,
  setMenuItems,
  menuItems,
  setActivePoll,
  setActiveCountdown,
  setActiveGuest,
  fetchPoll,
  fetchCountdown,
  MAX_CHAT_MESSAGES,
}: UseViewerAblyHandlersParams) {

  const onMessage = useCallback((message: any) => {
    const msgData = message as any;
    const chatMessage: ChatMessage = {
      id: msgData.id,
      userId: msgData.userId,
      username: msgData.username,
      displayName: msgData.displayName || msgData.username,
      avatarUrl: msgData.avatarUrl || msgData.user?.avatarUrl || null,
      content: msgData.content || msgData.message || '',
      timestamp: msgData.timestamp || (msgData.createdAt ? new Date(msgData.createdAt).getTime() : Date.now()),
      isCreator: msgData.isCreator,
      isModerator: msgData.isModerator,
      messageType: msgData.messageType || 'chat',
    };

    // Play sound for ticket purchases
    if (msgData.messageType === 'ticket_purchase') {
      const audio = new Audio('/sounds/ticket-purchase.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }

    setMessages((prev) => {
      if (prev.some(m => m.id === chatMessage.id)) {
        return prev;
      }
      const optimisticIndex = prev.findIndex(m =>
        m.id.startsWith('temp-') &&
        m.userId === chatMessage.userId &&
        m.content === chatMessage.content
      );
      if (optimisticIndex !== -1) {
        const newMessages = [...prev];
        newMessages[optimisticIndex] = chatMessage;
        return newMessages;
      }
      const recentDuplicate = prev.slice(-10).some(m =>
        m.userId === chatMessage.userId &&
        m.content === chatMessage.content &&
        m.messageType === 'chat'
      );
      if (recentDuplicate) {
        return prev;
      }
      const next = [...prev, chatMessage];
      return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
    });
  }, [setMessages, MAX_CHAT_MESSAGES]);

  const onGift = useCallback((giftEvent: any) => {
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

      setMessages(prev => {
        const next = [...prev, {
          id: `gift-${Date.now()}`,
          userId: giftEvent.streamGift.senderId,
          username: giftEvent.streamGift.senderUsername,
          displayName: null,
          avatarUrl: giftEvent.streamGift.senderAvatarUrl || null,
          content: `sent ${giftEvent.streamGift.quantity > 1 ? giftEvent.streamGift.quantity + 'x ' : ''}${giftEvent.gift.name}`,
          timestamp: Date.now(),
          messageType: 'gift' as const,
          giftEmoji: giftEvent.gift.emoji,
          giftName: giftEvent.gift.name,
          giftQuantity: giftEvent.streamGift.quantity,
        }];
        return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
      });
    }
    loadStream();
  }, [setFloatingGifts, setMessages, loadStream, MAX_CHAT_MESSAGES]);

  const onTip = useCallback((tipEvent: any) => {
    let content = `tipped ${tipEvent.amount} coins`;
    let messageType: ChatMessage['messageType'] = 'tip';

    if (tipEvent.menuItemLabel) {
      if (tipEvent.itemCategory === 'product' || tipEvent.fulfillmentType === 'digital') {
        content = `📥 purchased "${tipEvent.menuItemLabel}" for ${tipEvent.amount} coins`;
        messageType = 'menu_purchase';
      } else if (tipEvent.fulfillmentType === 'manual' || tipEvent.itemCategory === 'service') {
        content = `💌 ordered "${tipEvent.menuItemLabel}" for ${tipEvent.amount} coins`;
        messageType = 'menu_order';
      } else {
        content = `⭐ sent ${tipEvent.amount} coins for "${tipEvent.menuItemLabel}"`;
        messageType = 'menu_tip';
      }
    }

    setMessages(prev => {
      const next = [...prev, {
        id: `tip-${Date.now()}`,
        userId: tipEvent.senderId,
        username: tipEvent.senderUsername,
        displayName: null,
        avatarUrl: tipEvent.senderAvatarUrl || null,
        content,
        timestamp: Date.now(),
        messageType,
        tipAmount: tipEvent.amount,
      }];
      return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
    });
    loadStream();
  }, [setMessages, loadStream, MAX_CHAT_MESSAGES]);

  const onGoalUpdate = useCallback((update: any) => {
    loadStream();
    if (update.action === 'completed' && update.goal) {
      addCompletedGoal({
        id: update.goal.id || `goal-${Date.now()}`,
        title: update.goal.title || 'Stream Goal',
        rewardText: update.goal.rewardText || 'Goal reached!',
      });
    }
  }, [loadStream, addCompletedGoal]);

  const onViewerCount = useCallback((count: { currentViewers: number; peakViewers: number }) => {
    setStream((prev: any) => prev ? {
      ...prev,
      currentViewers: count.currentViewers,
      peakViewers: Math.max(prev.peakViewers, count.peakViewers),
    } : null);
  }, [setStream]);

  const onStreamEnded = useCallback(() => {
    setStreamEnded(true);
  }, [setStreamEnded]);

  const onTicketedAnnouncementCb = useCallback((announcement: any) => {
    setTicketedAnnouncement(announcement);
  }, [setTicketedAnnouncement]);

  const onVipModeChange = useCallback((vipEvent: any) => {
    if (vipEvent.isActive) {
      checkTicketAccess();
    } else {
      abortPendingTicketCheck();
      setTicketedModeActive(false);
      setTicketedShowInfo(null);
      setHasTicket(false);
      setHasPurchasedUpcomingTicket(false);
      setDismissedTicketedStream(null);
      setUpcomingTicketedShow(null);
      setTicketedAnnouncement(null);
    }
  }, [checkTicketAccess, abortPendingTicketCheck, setTicketedModeActive, setTicketedShowInfo, setHasTicket, setHasPurchasedUpcomingTicket, setDismissedTicketedStream, setUpcomingTicketedShow, setTicketedAnnouncement]);

  const onMenuToggle = useCallback((event: any) => {
    console.log('[Menu] Real-time toggle received:', event.enabled);
    setMenuEnabled(event.enabled);

    if (event.enabled && menuItems.length === 0) {
      const creatorId = stream?.creator?.id;
      if (creatorId) {
        fetch(`/api/tip-menu/${creatorId}`)
          .then(res => res.json())
          .then(menuData => {
            if (menuData.items && menuData.items.length > 0) {
              setMenuItems(menuData.items);
            }
          })
          .catch(err => {
            console.error('[Menu] Error fetching menu items on toggle:', err);
          });
      }
    }
  }, [setMenuEnabled, menuItems.length, stream?.creator?.id, setMenuItems]);

  const onPollUpdate = useCallback((event: any) => {
    console.log('[Viewer] Poll update received:', event);
    if (event.action === 'ended') {
      setActivePoll(null);
    } else {
      fetchPoll();
    }
  }, [setActivePoll, fetchPoll]);

  const onCountdownUpdate = useCallback((event: any) => {
    console.log('[Viewer] Countdown update received:', event);
    if (event.action === 'ended' || event.action === 'cancelled') {
      setActiveCountdown(null);
    } else {
      fetchCountdown();
    }
  }, [setActiveCountdown, fetchCountdown]);

  const onGuestJoined = useCallback((event: any) => {
    console.log('[Viewer] Guest joined:', event);
    setActiveGuest({
      userId: event.userId,
      username: event.username,
      displayName: event.displayName,
      avatarUrl: event.avatarUrl,
      requestType: event.requestType || 'video',
    });
  }, [setActiveGuest]);

  const onGuestRemoved = useCallback((event: any) => {
    console.log('[Viewer] Guest removed:', event);
    setActiveGuest(null);
  }, [setActiveGuest]);

  const { viewerCount: realtimeViewerCount } = useStreamChat({
    streamId,
    onMessage,
    onGift,
    onTip,
    onGoalUpdate,
    onViewerCount,
    onStreamEnded,
    onTicketedAnnouncement: onTicketedAnnouncementCb,
    onVipModeChange,
    onMenuToggle,
    onPollUpdate,
    onCountdownUpdate,
    onGuestJoined,
    onGuestRemoved,
  });

  const displayViewerCount = realtimeViewerCount > 0 ? realtimeViewerCount : (stream?.currentViewers || 0);

  return { displayViewerCount };
}
