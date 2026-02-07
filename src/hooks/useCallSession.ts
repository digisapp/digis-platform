'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useToastContext } from '@/context/ToastContext';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';
import type { CallToken, CallData, VirtualGift, ChatMessage } from '@/components/calls/types';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface UseCallSessionParams {
  callId: string;
  userId: string | undefined;
  router: AppRouterInstance;
}

export function useCallSession({ callId, userId, router }: UseCallSessionParams) {
  const { showError } = useToastContext();

  const [callToken, setCallToken] = useState<CallToken | null>(null);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Chat and tip state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [tipSending, setTipSending] = useState(false);
  const [showBuyCoinsModal, setShowBuyCoinsModal] = useState(false);
  const [totalTipsReceived, setTotalTipsReceived] = useState(0);
  const [gifts, setGifts] = useState<VirtualGift[]>([]);

  // Modal state
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [callEndedByOther, setCallEndedByOther] = useState(false);
  const [otherPartyError, setOtherPartyError] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string | null>(null);
  const [showCreatorSummary, setShowCreatorSummary] = useState(false);
  const [finalCallDuration, setFinalCallDuration] = useState(0);
  const [finalCallEarnings, setFinalCallEarnings] = useState(0);
  const [finalTipEarnings, setFinalTipEarnings] = useState(0);

  // Refs to track latest values for Ably callbacks (avoids stale closures)
  const durationRef = useRef(duration);
  const totalTipsReceivedRef = useRef(totalTipsReceived);
  const hasStartedRef = useRef(hasStarted);
  const showCreatorSummaryRef = useRef(showCreatorSummary);
  const callEndHandledRef = useRef(false);
  const callDataRef = useRef(callData);
  const userIdRef = useRef(userId);
  const chatMessagesRef = useRef(chatMessages);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { totalTipsReceivedRef.current = totalTipsReceived; }, [totalTipsReceived]);
  useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);
  useEffect(() => { showCreatorSummaryRef.current = showCreatorSummary; }, [showCreatorSummary]);
  useEffect(() => { callDataRef.current = callData; }, [callData]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

  // Derived values
  const estimatedCost = callData
    ? Math.ceil(duration / 60) * callData.ratePerMinute
    : 0;
  const isFan = !!(userId && callData && userId === callData.fanId);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Notify other party of connection error
  const notifyConnectionError = async (errorMessage: string) => {
    try {
      const ably = getAblyClient();
      const channel = ably.channels.get(`call:${callId}`);
      await channel.publish('connection_error', {
        userId,
        error: errorMessage,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('[CallPage] Failed to notify connection error:', e);
    }
  };

  // Fetch call token and data
  useEffect(() => {
    const fetchCallData = async () => {
      try {
        // Get LiveKit token
        const tokenRes = await fetch(`/api/calls/${callId}/token`);
        if (!tokenRes.ok) {
          const errorData = await tokenRes.json();
          const errorMsg = errorData.error || 'Failed to get call token';
          await notifyConnectionError(errorMsg);
          throw new Error(errorMsg);
        }
        const tokenData = await tokenRes.json();
        setCallToken(tokenData);

        // Get call details
        const callRes = await fetch(`/api/calls/${callId}`);
        if (!callRes.ok) {
          const errorMsg = 'Failed to get call details';
          await notifyConnectionError(errorMsg);
          throw new Error(errorMsg);
        }
        const callDetails = await callRes.json();
        setCallData(callDetails.call);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching call data:', err);
        setError(err.message || 'Failed to load call');
        setLoading(false);
      }
    };

    fetchCallData();
  }, [callId]);

  // Start call when connected
  const handleConnected = async () => {
    if (hasStartedRef.current) {
      console.log('[CallPage] handleConnected called but already started, skipping');
      return;
    }

    console.log('[CallPage] Room connected! Starting timer for both parties');
    setHasStarted(true);

    try {
      const res = await fetch(`/api/calls/${callId}/start`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.log('[CallPage] Call start API response:', errorData.error || 'already started');
      } else {
        console.log('[CallPage] Call started successfully on backend');
      }
    } catch (err) {
      console.error('[CallPage] Error calling start API:', err);
    }
  };

  // Timer for duration and cost
  useEffect(() => {
    if (!hasStarted) {
      console.log('[CallPage] Timer effect: hasStarted is false, not starting timer');
      return;
    }

    console.log('[CallPage] Timer effect: Starting timer! hasStarted =', hasStarted);

    const interval = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        if (newDuration % 10 === 0) {
          console.log('[CallPage] Timer tick: duration =', newDuration);
        }
        return newDuration;
      });
    }, 1000);

    return () => {
      console.log('[CallPage] Timer cleanup');
      clearInterval(interval);
    };
  }, [hasStarted]);

  // Fetch user balance (once on mount, then poll every 30s during active calls for fans)
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/wallet/balance');
        if (res.ok) {
          const data = await res.json();
          setUserBalance(data.balance || 0);
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    };
    fetchBalance();

    if (hasStarted && isFan) {
      const interval = setInterval(fetchBalance, 30_000);
      return () => clearInterval(interval);
    }
  }, [hasStarted, isFan]);

  // Fetch virtual gifts from API
  useEffect(() => {
    const fetchGifts = async () => {
      try {
        const res = await fetch('/api/gifts');
        if (res.ok) {
          const data = await res.json();
          setGifts(data.gifts || []);
        }
      } catch (err) {
        console.error('Error fetching gifts:', err);
      }
    };
    fetchGifts();
  }, []);

  // Send tip to creator
  const handleSendTip = async (amount: number) => {
    if (!callData || tipSending || !userId) return;

    if (userBalance < amount) {
      showError(`Insufficient balance. You need ${amount} coins but only have ${userBalance}.`);
      return;
    }

    setTipSending(true);
    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          receiverId: callData.creatorId,
          message: `Tip during video call`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserBalance(data.newBalance);
        console.log('[CallPage] Tip sent successfully, new balance:', data.newBalance);

        try {
          const ably = getAblyClient();
          const channel = ably.channels.get(`call:${callId}`);
          const senderName = callData.fan?.displayName || callData.fan?.username || 'Fan';

          await channel.publish('tip_sent', {
            id: `tip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            senderId: userId,
            senderName,
            amount,
            timestamp: Date.now(),
          });
          console.log('[CallPage] Tip published to Ably');
        } catch (ablyErr) {
          console.error('[CallPage] Failed to publish tip to Ably:', ablyErr);
        }
      } else {
        showError(data.error || 'Failed to send gift');
      }
    } catch (err) {
      console.error('Error sending gift:', err);
      showError('Failed to send gift');
    } finally {
      setTipSending(false);
    }
  };

  // Quick tip handler (10 coins) - for double-tap gesture
  const handleQuickTip = useCallback(() => {
    if (userBalance >= 10 && !tipSending) {
      handleSendTip(10);
    }
  }, [userBalance, tipSending, handleSendTip]);

  // Send gift to creator
  const handleSendGift = async (gift: VirtualGift) => {
    if (!callData || tipSending || !userId) return;

    if (userBalance < gift.coinCost) {
      showError(`Insufficient balance. You need ${gift.coinCost} coins but only have ${userBalance}.`);
      return;
    }

    setTipSending(true);
    try {
      const response = await fetch('/api/tips/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: gift.coinCost,
          receiverId: callData.creatorId,
          message: `Sent ${gift.emoji} ${gift.name} during video call`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserBalance(data.newBalance);
        console.log('[CallPage] Gift sent successfully, new balance:', data.newBalance);

        try {
          const ably = getAblyClient();
          const channel = ably.channels.get(`call:${callId}`);
          const senderName = callData.fan?.displayName || callData.fan?.username || 'Fan';

          await channel.publish('gift_sent', {
            id: `gift-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            senderId: userId,
            senderName,
            giftName: gift.name,
            giftEmoji: gift.emoji,
            giftRarity: gift.rarity,
            amount: gift.coinCost,
            timestamp: Date.now(),
          });
          console.log('[CallPage] Gift published to Ably');
        } catch (ablyErr) {
          console.error('[CallPage] Failed to publish gift to Ably:', ablyErr);
        }
      } else {
        showError(data.error || 'Failed to send gift');
      }
    } catch (err) {
      console.error('Error sending gift:', err);
      showError('Failed to send gift');
    } finally {
      setTipSending(false);
    }
  };

  // Send chat message via Ably
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !userId) return;

    const msgContent = messageInput.trim();
    setMessageInput('');

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timestamp = Date.now();

    const senderName = callData?.fan?.id === userId
      ? (callData.fan.displayName || callData.fan.username)
      : (callData?.creator?.displayName || callData?.creator?.username || 'Unknown');

    // Optimistically add message locally
    setChatMessages((prev) => [...prev, {
      id: msgId,
      sender: userId,
      senderName: 'You',
      content: msgContent,
      timestamp,
      type: 'chat',
    }]);

    try {
      const ably = getAblyClient();
      const channel = ably.channels.get(`call:${callId}`);

      await channel.publish('chat_message', {
        id: msgId,
        senderId: userId,
        senderName,
        content: msgContent,
        timestamp,
        type: 'chat',
      });
      console.log('[CallPage] Chat message published to Ably');
    } catch (err) {
      console.error('[CallPage] Failed to send message:', err);
    }
  };

  // Save chat log to server (best-effort, uses sendBeacon as fallback)
  const saveChatLog = useCallback((msgs: ChatMessage[]) => {
    if (!msgs.length) return;
    const body = JSON.stringify({ messages: msgs });
    const url = `/api/calls/${callId}/chat-log`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    }
  }, [callId]);

  // Subscribe to call events via Ably
  useEffect(() => {
    let channel: Ably.RealtimeChannel | null = null;
    let mounted = true;

    const setupChannel = async () => {
      try {
        const ably = getAblyClient();

        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => {
              clearTimeout(timeout);
              resolve();
            });
            ably.connection.once('failed', () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            });
          });
        }

        if (!mounted) return;

        channel = ably.channels.get(`call:${callId}`);

        if (channel.state !== 'attached') {
          await Promise.race([
            channel.attach(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Channel attach timeout')), 10000))
          ]);
        }

        if (!mounted) return;

        console.log('[CallPage] Ably channel attached, subscribing to events');

        channel.subscribe('call_ended', (message) => {
          console.log('[Ably call_ended] Call ended by other party:', message.data);

          if (callEndHandledRef.current || showCreatorSummaryRef.current) {
            console.log('[Ably call_ended] Already handled or summary showing, skipping');
            return;
          }

          const currentCallData = callDataRef.current;
          const currentUserId = userIdRef.current;

          const isCreator = currentUserId && currentCallData && currentUserId === currentCallData.creatorId;
          const callHasStarted = hasStartedRef.current || durationRef.current > 0;
          console.log('[Ably call_ended] isCreator:', isCreator, 'callHasStarted:', callHasStarted, 'duration:', durationRef.current, 'userId:', currentUserId, 'creatorId:', currentCallData?.creatorId);

          callEndHandledRef.current = true;

          saveChatLog(chatMessagesRef.current);

          if (isCreator && callHasStarted) {
            const currentDuration = durationRef.current;
            const callEarnings = currentCallData ? Math.ceil(currentDuration / 60) * currentCallData.ratePerMinute : 0;
            console.log('[Ably call_ended] Showing creator summary! duration:', currentDuration, 'earnings:', callEarnings);
            setFinalCallDuration(currentDuration);
            setFinalCallEarnings(callEarnings);
            setFinalTipEarnings(totalTipsReceivedRef.current);
            setShowCreatorSummary(true);
            setCallEndedByOther(false);
          } else {
            setCallEndedByOther(true);
            setTimeout(() => {
              router.push(isCreator ? '/creator/dashboard' : '/dashboard');
            }, 2000);
          }
        });

        channel.subscribe('call_accepted', (message) => {
          console.log('Call accepted:', message.data);
        });

        channel.subscribe('call_rejected', (message) => {
          console.log('Call rejected:', message.data);
          const reason = message.data?.reason;
          if (reason) {
            setDeclineReason(reason);
            setError(`Call declined: "${reason}"`);
          } else {
            setError('Call was declined');
          }
          const currentCallData = callDataRef.current;
          const currentUserId = userIdRef.current;
          const isCreatorUser = currentUserId && currentCallData && currentUserId === currentCallData.creatorId;
          setTimeout(() => {
            router.push(isCreatorUser ? '/creator/dashboard' : '/dashboard');
          }, 3000);
        });

        channel.subscribe('connection_error', (message) => {
          console.log('Other party had connection error:', message.data);
          if (message.data.userId !== userIdRef.current) {
            setOtherPartyError(message.data.error || 'Connection failed');
          }
        });

        channel.subscribe('chat_message', (message) => {
          const data = message.data;
          setChatMessages((prev) => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id,
              sender: data.senderId,
              senderName: data.senderId === userIdRef.current ? 'You' : data.senderName,
              content: data.content,
              timestamp: data.timestamp,
              type: data.type || 'chat',
            }];
          });
        });

        channel.subscribe('tip_sent', (message) => {
          const data = message.data;
          setChatMessages((prev) => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id || `tip-${Date.now()}`,
              sender: data.senderId,
              senderName: data.senderId === userIdRef.current ? 'You' : data.senderName,
              content: `tipped ${data.amount} coins`,
              timestamp: data.timestamp || Date.now(),
              type: 'tip',
              amount: data.amount,
            }];
          });
          if (data.senderId !== userIdRef.current) {
            setTotalTipsReceived((prev) => prev + (data.amount || 0));
          }
        });

        channel.subscribe('gift_sent', (message) => {
          const data = message.data;
          if (data.senderId !== userIdRef.current) {
            setTotalTipsReceived((prev) => prev + (data.amount || 0));
          }
          setChatMessages((prev) => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, {
              id: data.id || `gift-${Date.now()}`,
              sender: data.senderId,
              senderName: data.senderId === userIdRef.current ? 'You' : data.senderName,
              content: `sent ${data.giftName}`,
              timestamp: data.timestamp || Date.now(),
              type: 'gift',
              giftEmoji: data.giftEmoji,
              giftName: data.giftName,
              giftRarity: data.giftRarity,
              amount: data.amount,
            }];
          });
        });

      } catch (err) {
        console.error('[CallPage] Ably setup error:', err);
      }
    };

    setupChannel();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
        if (channel.state === 'attached') {
          channel.detach().catch(() => {});
        }
      }
    };
  }, [callId, router]);

  // Handle remote participant disconnection
  const handleRemoteLeft = useCallback(() => {
    console.log('[handleRemoteLeft] Remote participant disconnected');
    console.log('[handleRemoteLeft] user.id:', userId, 'callData.creatorId:', callData?.creatorId, 'hasStartedRef:', hasStartedRef.current, 'durationRef:', durationRef.current);

    if (callEndHandledRef.current || showCreatorSummaryRef.current) {
      console.log('[handleRemoteLeft] Already handled or summary showing, skipping');
      return;
    }

    fetch(`/api/calls/${callId}/end`, { method: 'POST' }).catch(() => {});

    const isCreator = userId && callData && userId === callData.creatorId;
    const callHasStarted = hasStartedRef.current || durationRef.current > 0;
    console.log('[handleRemoteLeft] isCreator:', isCreator, 'callHasStarted:', callHasStarted);

    callEndHandledRef.current = true;

    if (isCreator && callHasStarted) {
      const currentDuration = durationRef.current;
      const callEarnings = callData ? Math.ceil(currentDuration / 60) * callData.ratePerMinute : 0;
      console.log('[handleRemoteLeft] Showing creator summary! duration:', currentDuration, 'earnings:', callEarnings);
      setFinalCallDuration(currentDuration);
      setFinalCallEarnings(callEarnings);
      setFinalTipEarnings(totalTipsReceivedRef.current);
      setShowCreatorSummary(true);
      setCallEndedByOther(false);
    } else {
      setCallEndedByOther(true);
      setTimeout(() => {
        router.push(isCreator ? '/creator/dashboard' : '/dashboard');
      }, 2000);
    }
  }, [callId, router, userId, callData]);

  // End call (shows confirm)
  const handleEndCall = async () => {
    if (isEnding) return;
    setShowEndConfirm(true);
  };

  const confirmEndCall = async () => {
    setIsEnding(true);
    setShowEndConfirm(false);

    saveChatLog(chatMessages);

    const isCreator = userId && callData && userId === callData.creatorId;
    const callHasStarted = hasStartedRef.current || durationRef.current > 0;
    console.log('[confirmEndCall] isCreator:', isCreator, 'hasStarted:', hasStarted, 'hasStartedRef:', hasStartedRef.current, 'duration:', durationRef.current, 'callHasStarted:', callHasStarted);

    try {
      const res = await fetch(`/api/calls/${callId}/end`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to end call');
      }

      const result = await res.json();
      console.log('Call ended:', result);

      callEndHandledRef.current = true;

      if (isCreator && callHasStarted) {
        const currentDuration = durationRef.current;
        const callEarnings = callData ? Math.ceil(currentDuration / 60) * callData.ratePerMinute : 0;
        console.log('[confirmEndCall] Showing creator summary! duration:', currentDuration, 'earnings:', callEarnings);
        setFinalCallDuration(currentDuration);
        setFinalCallEarnings(callEarnings);
        setFinalTipEarnings(totalTipsReceivedRef.current);
        setShowCreatorSummary(true);
        setCallEndedByOther(false);
        setIsEnding(false);
      } else {
        console.log('[confirmEndCall] NOT showing summary - isCreator:', isCreator, 'callHasStarted:', callHasStarted);
        router.push(isCreator ? '/creator/dashboard' : '/dashboard');
      }
    } catch (err: any) {
      console.error('Error ending call:', err);
      setIsEnding(false);
      const isCreatorUser = userId && callData && userId === callData.creatorId;
      setTimeout(() => router.push(isCreatorUser ? '/creator/dashboard' : '/dashboard'), 2000);
    }
  };

  return {
    // Core state
    callToken,
    callData,
    loading,
    error,
    duration,
    isEnding,
    hasStarted,
    declineReason,

    // Chat & tips
    chatMessages,
    messageInput,
    setMessageInput,
    userBalance,
    setUserBalance,
    tipSending,
    showBuyCoinsModal,
    setShowBuyCoinsModal,
    totalTipsReceived,
    gifts,

    // Modals
    showEndConfirm,
    setShowEndConfirm,
    callEndedByOther,
    otherPartyError,
    setOtherPartyError,
    showCreatorSummary,
    finalCallDuration,
    finalCallEarnings,
    finalTipEarnings,

    // Derived
    estimatedCost,
    isFan,
    formatDuration,

    // Actions
    handleConnected,
    handleSendTip,
    handleQuickTip,
    handleSendGift,
    handleSendMessage,
    handleRemoteLeft,
    handleEndCall,
    confirmEndCall,
  };
}
