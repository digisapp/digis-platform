'use client';

import { useState } from 'react';

interface TicketedShowInfo {
  showId: string;
  showTitle: string;
  ticketPrice: number;
}

interface UseTicketPurchaseFlowParams {
  streamId: string;
  currentUser: any;
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  showError: (msg: string) => void;
  setShowBuyCoinsModal: (show: boolean) => void;
  routerPush: (path: string) => void;
}

export function useTicketPurchaseFlow({
  streamId,
  currentUser,
  userBalance,
  setUserBalance,
  showError,
  setShowBuyCoinsModal,
  routerPush,
}: UseTicketPurchaseFlowParams) {
  const [ticketedModeActive, setTicketedModeActive] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  const [ticketedShowInfo, setTicketedShowInfo] = useState<TicketedShowInfo | null>(null);
  const [purchasingTicket, setPurchasingTicket] = useState(false);
  const [showQuickBuyModal, setShowQuickBuyModal] = useState(false);
  const [quickBuyInfo, setQuickBuyInfo] = useState<{
    showId: string;
    title: string;
    price: number;
  } | null>(null);
  const [quickBuyLoading, setQuickBuyLoading] = useState(false);
  const [hasPurchasedUpcomingTicket, setHasPurchasedUpcomingTicket] = useState(false);
  const [showTicketPurchaseSuccess, setShowTicketPurchaseSuccess] = useState(false);
  const [ticketedAnnouncement, setTicketedAnnouncement] = useState<{
    ticketedStreamId: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
    minutesUntilStart: number;
  } | null>(null);
  const [dismissedTicketedStream, setDismissedTicketedStream] = useState<{
    ticketedStreamId: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
  } | null>(null);
  const [upcomingTicketedShow, setUpcomingTicketedShow] = useState<{
    id: string;
    title: string;
    ticketPrice: number;
    startsAt: string;
  } | null>(null);

  const checkTicketAccess = async () => {
    try {
      const response = await fetch(`/api/streams/${streamId}/vip`);
      if (response.ok) {
        const data = await response.json();
        setTicketedModeActive(data.vipActive);
        setHasTicket(data.hasAccess);
        if (data.vipActive && data.showId) {
          setTicketedShowInfo({
            showId: data.showId,
            showTitle: data.showTitle,
            ticketPrice: data.ticketPrice,
          });
        }
      }
    } catch (error) {
      console.error('[Ticketed] Error checking ticket access:', error);
    }
  };

  const handleInstantTicketPurchase = async () => {
    if (!ticketedShowInfo || !currentUser) {
      if (!currentUser) {
        routerPush('/login');
      }
      return;
    }

    if (userBalance < ticketedShowInfo.ticketPrice) {
      setShowBuyCoinsModal(true);
      return;
    }

    setPurchasingTicket(true);
    try {
      const response = await fetch(`/api/shows/${ticketedShowInfo.showId}/purchase`, {
        method: 'POST',
      });

      if (response.ok) {
        const successData = await response.json();
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
        if (typeof successData.newBalance === 'number') {
          setUserBalance(successData.newBalance);
        } else {
          setUserBalance(prev => prev - ticketedShowInfo.ticketPrice);
        }
        setHasTicket(true);
      } else {
        const data = await response.json();
        if (data.error?.includes('Insufficient')) {
          setShowBuyCoinsModal(true);
        } else {
          showError(data.error || 'Failed to purchase ticket');
        }
      }
    } catch (error) {
      console.error('[Ticketed] Error purchasing ticket:', error);
      showError('Failed to purchase ticket. Please try again.');
    } finally {
      setPurchasingTicket(false);
    }
  };

  const handleQuickBuyTicket = async (showId: string, price: number) => {
    if (!currentUser) {
      routerPush('/login');
      return;
    }

    if (userBalance < price) {
      setShowBuyCoinsModal(true);
      return;
    }

    setQuickBuyLoading(true);
    try {
      const response = await fetch(`/api/shows/${showId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamId }),
      });

      const data = await response.json();

      if (response.ok) {
        const audio = new Audio('/sounds/ticket-purchase.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});

        setUserBalance(prev => prev - price);
        setShowQuickBuyModal(false);
        setQuickBuyInfo(null);
        setTicketedAnnouncement(null);
        setDismissedTicketedStream(null);
        setUpcomingTicketedShow(null);
        setHasPurchasedUpcomingTicket(true);
        setHasTicket(true);
        setShowTicketPurchaseSuccess(true);
        setTimeout(() => setShowTicketPurchaseSuccess(false), 3000);
      } else {
        if (data.error?.includes('Insufficient')) {
          setShowBuyCoinsModal(true);
        } else if (data.error?.includes('already')) {
          setShowQuickBuyModal(false);
          setQuickBuyInfo(null);
          setTicketedAnnouncement(null);
          setDismissedTicketedStream(null);
          setUpcomingTicketedShow(null);
          setHasPurchasedUpcomingTicket(true);
          setHasTicket(true);
        } else {
          showError(data.error || 'Failed to purchase ticket');
        }
      }
    } catch (error) {
      console.error('[Ticketed] Error purchasing ticket:', error);
      showError('Failed to purchase ticket. Please try again.');
    } finally {
      setQuickBuyLoading(false);
    }
  };

  return {
    // State
    ticketedModeActive,
    setTicketedModeActive,
    hasTicket,
    setHasTicket,
    ticketedShowInfo,
    setTicketedShowInfo,
    purchasingTicket,
    showQuickBuyModal,
    setShowQuickBuyModal,
    quickBuyInfo,
    setQuickBuyInfo,
    quickBuyLoading,
    hasPurchasedUpcomingTicket,
    setHasPurchasedUpcomingTicket,
    showTicketPurchaseSuccess,
    setShowTicketPurchaseSuccess,
    ticketedAnnouncement,
    setTicketedAnnouncement,
    dismissedTicketedStream,
    setDismissedTicketedStream,
    upcomingTicketedShow,
    setUpcomingTicketedShow,
    // Actions
    checkTicketAccess,
    handleInstantTicketPurchase,
    handleQuickBuyTicket,
  };
}
