'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToastContext } from '@/context/ToastContext';
import type { StreamMessage } from '@/db/schema';
import type { StreamWithCreator } from '@/components/streaming/stream-viewer/types';

interface UseStreamViewerActionsParams {
  streamId: string;
  stream: StreamWithCreator | null;
  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
  followLoading: boolean;
  setFollowLoading: (v: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<StreamMessage[]>>;
  fetchUserBalance: () => Promise<void>;
}

export function useStreamViewerActions({
  streamId,
  stream,
  isFollowing,
  setIsFollowing,
  followLoading,
  setFollowLoading,
  setMessages,
  fetchUserBalance,
}: UseStreamViewerActionsParams) {
  const router = useRouter();
  const { showSuccess, showError } = useToastContext();
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // UI state
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const [isRequestingCall, setIsRequestingCall] = useState(false);
  const [callRequestError, setCallRequestError] = useState<string | null>(null);

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    if (showControls) {
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
    }
    return () => { if (controlsTimeout) clearTimeout(controlsTimeout); };
  }, [showControls]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSendMessage = async (message: string) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      streamId,
      userId: 'current-user',
      username: 'You',
      message: message,
      messageType: 'chat' as const,
      giftId: null,
      giftAmount: null,
      tipMenuItemId: null,
      tipMenuItemLabel: null,
      isAiGenerated: false,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await fetch(`/api/streams/${streamId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      const responseData = await response.json();
      if (responseData.message?.id) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw error;
    }
  };

  const handleSendGift = async (giftId: string, quantity: number, recipientCreatorId?: string, recipientUsername?: string) => {
    const response = await fetch(`/api/streams/${streamId}/gift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giftId, quantity, recipientCreatorId, recipientUsername }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send gift');
    }
    fetchUserBalance();
  };

  const handleSendTip = async (amount: number, recipientCreatorId?: string, recipientUsername?: string, message?: string) => {
    const response = await fetch(`/api/streams/${streamId}/tip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, recipientCreatorId, recipientUsername, message }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send gift');
    }
    fetchUserBalance();
  };

  const handleFollowToggle = async () => {
    if (!stream?.creator?.id || followLoading) return;
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`/api/creators/${stream.creator.id}/follow`, { method });
      if (response.ok) setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRequestCall = async (callType: 'video' | 'voice') => {
    if (!stream?.creator?.id || isRequestingCall) return;

    setIsRequestingCall(true);
    setCallRequestError(null);

    try {
      const response = await fetch('/api/calls/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId: stream.creator.id, callType }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCallRequestModal(false);
        router.push(`/calls/${data.call.id}`);
      } else {
        setCallRequestError(data.error || 'Failed to request call');
      }
    } catch (err) {
      setCallRequestError('Failed to request call. Please try again.');
    } finally {
      setIsRequestingCall(false);
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    const videos = document.querySelectorAll('video');
    videos.forEach(v => v.muted = !isMuted);
  };

  const shareStream = async () => {
    const url = window.location.href;
    const text = `Watch ${stream?.creator?.username} live on Digis!`;
    if (navigator.share) {
      await navigator.share({ title: stream?.title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      showSuccess('Link copied!');
    }
  };

  return {
    videoContainerRef,
    isMuted, isFullscreen, showChat, setShowChat,
    showGiftPanel, setShowGiftPanel, showControls, setShowControls,
    showCallRequestModal, setShowCallRequestModal,
    isRequestingCall, callRequestError,
    handleSendMessage, handleSendGift, handleSendTip,
    handleFollowToggle, handleRequestCall,
    toggleFullscreen, toggleMute, shareStream,
  };
}
