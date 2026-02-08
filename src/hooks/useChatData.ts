'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';
import type { Message, Conversation } from '@/components/chat/types';

export function useChatData({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const costFetchedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Cost display
  const [costPerMessage, setCostPerMessage] = useState<number | null>(null);
  const [recipientIsCreator, setRecipientIsCreator] = useState(false);

  // Core state
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Pagination
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageCursor, setOldestMessageCursor] = useState<string | null>(null);

  // Pending / new messages
  const [pendingMessages, setPendingMessages] = useState<Map<string, { content: string; timestamp: Date }>>(new Map());
  const [newMessageCount, setNewMessageCount] = useState(0);

  // Charge acknowledgment persisted in localStorage
  const [hasAcknowledgedCharge, setHasAcknowledgedChargeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`chat_rate_accepted_${conversationId}`) === 'true';
    }
    return false;
  });

  const setHasAcknowledgedCharge = (value: boolean) => {
    setHasAcknowledgedChargeState(value);
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(`chat_rate_accepted_${conversationId}`, 'true');
      } else {
        localStorage.removeItem(`chat_rate_accepted_${conversationId}`);
      }
    }
  };

  // --- Fetch functions ---

  const fetchUserBalance = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUserId(user.id);
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserRole(userData.role || 'fan');
        setCurrentUserIsAdmin(userData.role === 'admin' || userData.isAdmin === true);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchCreatorRate = async (creatorId: string) => {
    if (costFetchedRef.current) return;
    try {
      const response = await fetch(`/api/creator/${creatorId}/rate`);
      if (response.ok) {
        const data = await response.json();
        const rate = typeof data.messageRate === 'number' ? data.messageRate : 0;
        costFetchedRef.current = true;
        setCostPerMessage(rate);
        setRecipientIsCreator(true);
      }
    } catch (error) {
      console.error('Error fetching creator rate:', error);
    }
  };

  const fetchConversation = async () => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/details`);
      const data = await response.json();
      if (response.ok && data.conversation) {
        const conv = data.conversation;
        setConversation(conv);
        if (!costFetchedRef.current && conv.otherUser?.id) {
          const isCreator = conv.otherUser?.role === 'creator';
          if (isCreator) {
            setRecipientIsCreator(true);
            if (typeof conv.otherUser.messageCharge === 'number') {
              costFetchedRef.current = true;
              setCostPerMessage(conv.otherUser.messageCharge);
            } else {
              fetchCreatorRate(conv.otherUser.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      let response = await fetch(`/api/messages/conversations/${conversationId}?limit=100&useCursor=true`);
      let data = await response.json();

      if (!response.ok) {
        response = await fetch(`/api/messages/conversations/${conversationId}?limit=100`);
        data = await response.json();
      }

      if (response.ok && data.messages) {
        const fetchedMessages = data.messages.reverse();

        // Clear confirmed pending messages
        if (pendingMessages.size > 0) {
          setPendingMessages(prev => {
            const newPending = new Map(prev);
            Array.from(prev.entries()).forEach(([tempId, pending]) => {
              const isConfirmed = fetchedMessages.some((m: Message) =>
                m.content === pending.content &&
                Math.abs(new Date(m.createdAt).getTime() - pending.timestamp.getTime()) < 10000
              );
              if (isConfirmed) newPending.delete(tempId);
            });
            return newPending;
          });
        }

        // Track new messages when scrolled up
        if (!isNearBottomRef.current && messages.length > 0) {
          const existingIds = new Set(messages.map(m => m.id));
          const newMsgs = fetchedMessages.filter((m: Message) => !existingIds.has(m.id) && m.sender.id !== currentUserId);
          if (newMsgs.length > 0) {
            setNewMessageCount(prev => prev + newMsgs.length);
          }
        }

        setMessages(fetchedMessages);
        setHasMoreMessages(data.hasMore ?? data.messages.length >= 100);

        if (fetchedMessages.length > 0) {
          setOldestMessageCursor(fetchedMessages[0].createdAt.toString());
        }

        // Backup: check messages for creator rate
        if (!costFetchedRef.current && fetchedMessages.length > 0 && currentUserId) {
          const otherUser = fetchedMessages.find((m: any) => m.sender?.id !== currentUserId)?.sender;
          if (otherUser && otherUser.role === 'creator') {
            setRecipientIsCreator(true);
            fetchCreatorRate(otherUser.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages || !oldestMessageCursor) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/messages/conversations/${conversationId}?limit=100&cursor=${encodeURIComponent(oldestMessageCursor)}&direction=older`
      );
      const data = await response.json();
      if (response.ok && data.messages.length > 0) {
        const olderMessages = data.messages.reverse();
        setMessages(prev => [...olderMessages, ...prev]);
        lastMessageCountRef.current = messages.length + olderMessages.length;
        setOldestMessageCursor(olderMessages[0].createdAt.toString());
        setHasMoreMessages(data.hasMore ?? data.messages.length >= 100);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const scrollToBottom = (force = false) => {
    if (force) {
      isNearBottomRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 200;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const wasNearBottom = isNearBottomRef.current;
    isNearBottomRef.current = distanceFromBottom < threshold;
    if (!wasNearBottom && isNearBottomRef.current && newMessageCount > 0) {
      setNewMessageCount(0);
    }
  }, [newMessageCount]);

  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    const now = Date.now();
    if (isTyping && now - lastTypingSentRef.current < 1000) return;
    lastTypingSentRef.current = now;
    try {
      await fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, isTyping }),
      });
    } catch {
      // Typing indicators are not critical
    }
  }, [conversationId]);

  // --- Effects ---

  // Reset state on conversation change
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setConversation(null);
    isInitialLoadRef.current = true;
    costFetchedRef.current = false;
  }, [conversationId]);

  // Init + real-time subscriptions
  useEffect(() => {
    checkAuth();
    fetchConversation();
    fetchMessages();
    markAsRead();
    fetchUserBalance();

    // Supabase real-time for messages
    const supabase = createClient();
    const messageChannel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => { fetchMessages(); markAsRead(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => { fetchMessages(); })
      .subscribe((status) => {
        const isConnected = status === 'SUBSCRIBED';
        setRealtimeConnected(isConnected);
        if (isConnected) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => { fetchMessages(); }, 5000);
        }
      });

    // Ably typing indicators
    let typingChannel: Ably.RealtimeChannel | null = null;
    const setupTypingChannel = async () => {
      try {
        const ably = getAblyClient();
        if (ably.connection.state !== 'connected') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
            ably.connection.once('connected', () => { clearTimeout(timeout); resolve(); });
            ably.connection.once('failed', () => { clearTimeout(timeout); reject(new Error('Connection failed')); });
          });
        }
        typingChannel = ably.channels.get(`dm:${conversationId}`);
        typingChannel.subscribe('typing', (message) => {
          const { userId, isTyping } = message.data;
          if (userId !== currentUserId) {
            setIsOtherUserTyping(isTyping);
            if (isTyping) {
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => setIsOtherUserTyping(false), 5000);
            }
          }
        });
      } catch (err) {
        console.error('[Chat] Ably typing channel setup error:', err);
      }
    };
    setupTypingChannel();

    return () => {
      supabase.removeChannel(messageChannel);
      if (typingChannel) {
        typingChannel.unsubscribe();
        if (typingChannel.state === 'attached') typingChannel.detach().catch(() => {});
      }
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, currentUserId]);

  // Smart auto-scroll
  useEffect(() => {
    const messageCount = messages.length;
    const hasNewMessages = messageCount > lastMessageCountRef.current;

    if (isInitialLoadRef.current && messageCount > 0) {
      isInitialLoadRef.current = false;
      lastMessageCountRef.current = messageCount;
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, 100);
      return;
    }

    if (hasNewMessages && isNearBottomRef.current) {
      lastMessageCountRef.current = messageCount;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      lastMessageCountRef.current = messageCount;
    }
  }, [messages]);

  // Auto-acknowledge charge if user has already sent messages
  useEffect(() => {
    if (currentUserId && messages.length > 0 && recipientIsCreator) {
      const hasUserSentMessages = messages.some(m => m.sender.id === currentUserId);
      if (hasUserSentMessages) setHasAcknowledgedCharge(true);
    }
  }, [currentUserId, messages, recipientIsCreator]);

  return {
    // Refs
    messagesEndRef, messagesContainerRef,
    // Core state
    loading, currentUserId, currentUserRole, currentUserIsAdmin,
    conversation, messages, setMessages, userBalance,
    isOtherUserTyping, realtimeConnected,
    // Cost
    costPerMessage, recipientIsCreator, hasAcknowledgedCharge, setHasAcknowledgedCharge,
    // Pagination
    hasMoreMessages, loadingMore,
    // Pending
    pendingMessages, setPendingMessages, newMessageCount, setNewMessageCount,
    // Actions
    fetchMessages, fetchUserBalance, loadMoreMessages,
    scrollToBottom, handleScroll, sendTypingIndicator,
  };
}
