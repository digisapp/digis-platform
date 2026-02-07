'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { streamAnalytics } from '@/lib/utils/analytics';

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

interface UseViewerInteractionsParams {
  streamId: string;
  stream: any;
  currentUser: any;
  userBalance: number;
  setUserBalance: (balance: number) => void;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showInfo: (msg: string) => void;
  clipIt: () => Promise<Blob | null>;
  clipBufferSeconds: number;
  setClipIsClipping: (v: boolean) => void;
  loadStream: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  MAX_CHAT_MESSAGES: number;
}

interface FloatingGift {
  id: string;
  emoji: string;
  rarity: string;
  timestamp: number;
  giftName?: string;
}

export function useViewerInteractions({
  streamId,
  stream,
  currentUser,
  userBalance,
  setUserBalance,
  showSuccess,
  showError,
  showInfo,
  clipIt,
  clipBufferSeconds,
  setClipIsClipping,
  loadStream,
  setMessages,
  MAX_CHAT_MESSAGES,
}: UseViewerInteractionsParams) {
  const router = useRouter();

  // Chat input state
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Digital download confirmation state
  const [digitalDownload, setDigitalDownload] = useState<{
    show: boolean;
    url: string;
    itemLabel: string;
    amount: number;
  } | null>(null);

  // Floating gift emojis state
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);

  const removeFloatingGift = useCallback((id: string) => {
    setFloatingGifts(prev => prev.filter(g => g.id !== id));
  }, []);

  // Send chat message
  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !currentUser || sendingMessage) return;

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName,
      avatarUrl: currentUser.avatarUrl,
      content: messageInput,
      timestamp: Date.now(),
      isCreator: currentUser.id === stream?.creator.id,
    };

    setMessages((prev) => {
      const next = [...prev, optimisticMessage];
      return next.length > MAX_CHAT_MESSAGES ? next.slice(-MAX_CHAT_MESSAGES) : next;
    });
    setMessageInput('');
    setSendingMessage(true);

    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: optimisticMessage.content }),
      });

      if (!response.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      } else {
        streamAnalytics.chatMessageSent(streamId);
      }
    } catch (error) {
      console.error('[TheaterMode] Error sending message:', error);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setSendingMessage(false);
    }
  }, [messageInput, currentUser, sendingMessage, stream?.creator.id, streamId, setMessages, MAX_CHAT_MESSAGES]);

  // Handle tip with optional note and menu item
  const handleTip = useCallback(async (amount: number, note?: string, tipMenuItem?: { id: string; label: string } | null) => {
    if (!currentUser) {
      showInfo('Please sign in to send gifts');
      return;
    }

    if (userBalance < amount) {
      showInfo(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    const idempotencyKey = `tip-${crypto.randomUUID()}`;

    try {
      const response = await fetch('/api/tips/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          amount,
          streamId,
          note: note?.trim() || undefined,
          tipMenuItemId: tipMenuItem?.id,
          tipMenuItemLabel: tipMenuItem?.label,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.newBalance);
        streamAnalytics.quickTipSent(streamId, amount);

        // Play sound based on tip type and amount
        if (tipMenuItem) {
          const audio = new Audio('/sounds/menu-purchase.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } else {
          let soundFile = '/sounds/coin-common.mp3';
          if (amount >= 1000) {
            soundFile = '/sounds/coin-legendary.mp3';
          } else if (amount >= 500) {
            soundFile = '/sounds/coin-epic.mp3';
          } else if (amount >= 200) {
            soundFile = '/sounds/coin-rare.mp3';
          } else if (amount >= 50) {
            soundFile = '/sounds/coin-super.mp3';
          } else if (amount >= 10) {
            soundFile = '/sounds/coin-nice.mp3';
          }
          const audio = new Audio(soundFile);
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }

        // Show digital download confirmation if applicable
        if (data.digitalContentUrl && data.fulfillmentType === 'digital') {
          setDigitalDownload({
            show: true,
            url: data.digitalContentUrl,
            itemLabel: data.itemLabel || tipMenuItem?.label || 'Digital Product',
            amount,
          });
        }
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to send gift');
      }
    } catch (error) {
      console.error('[TheaterMode] Error sending gift:', error);
      showError('Failed to send gift');
    }
  }, [currentUser, userBalance, streamId, setUserBalance, showInfo, showError]);

  // Send gift
  const handleSendGift = useCallback(async (giftId: string, quantity: number) => {
    if (!currentUser || !stream) {
      throw new Error('Please sign in to send gifts');
    }

    const idempotencyKey = `gift-${crypto.randomUUID()}`;

    const response = await fetch(`/api/streams/${streamId}/gift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ giftId, quantity }),
    });

    if (response.ok) {
      const data = await response.json();
      setUserBalance(data.newBalance);
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send gift');
    }
  }, [currentUser, stream, streamId, setUserBalance]);

  // Share stream
  const shareStream = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: stream?.title,
          text: `Watch ${stream?.creator.displayName || stream?.creator.username} live!`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        showSuccess('Link copied to clipboard!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          showSuccess('Link copied to clipboard!');
        } catch {
          showError('Unable to share. Please copy the URL manually.');
        }
      }
    }
  }, [stream?.title, stream?.creator.displayName, stream?.creator.username, showSuccess, showError]);

  // Create clip
  const handleCreateClip = useCallback(async () => {
    if (!currentUser) {
      showInfo('Sign in to create clips');
      router.push(`/login?redirect=/live/${streamId}`);
      return;
    }

    const blob = await clipIt();
    if (!blob) return;

    setClipIsClipping(true);
    try {
      const formData = new FormData();
      formData.append('video', blob, `clip-${Date.now()}.webm`);
      formData.append('title', `Live Clip - ${stream?.title || 'Stream'}`);
      formData.append('streamId', streamId);
      formData.append('duration', String(Math.min(clipBufferSeconds, 30)));

      const response = await fetch('/api/clips/live', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create clip');
      }

      // Trigger instant download of the clip from the in-memory blob
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const safeName = (stream?.title || 'clip').replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
      a.download = `${safeName}-clip.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showSuccess('Clipped & saved!');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create clip');
    } finally {
      setClipIsClipping(false);
    }
  }, [currentUser, clipIt, clipBufferSeconds, streamId, stream?.title, showSuccess, showError, showInfo, router, setClipIsClipping]);

  return {
    messageInput,
    setMessageInput,
    sendingMessage,
    sendMessage,
    handleTip,
    handleSendGift,
    shareStream,
    handleCreateClip,
    digitalDownload,
    setDigitalDownload,
    floatingGifts,
    setFloatingGifts,
    removeFloatingGift,
  };
}
