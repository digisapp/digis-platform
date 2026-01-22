'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { TipModal } from '@/components/messages/TipModal';
import { Gift, MoreVertical, Coins, Plus, Camera, Film, Mic, FolderOpen, X, Send } from 'lucide-react';
import { MediaAttachmentModal } from '@/components/messages/MediaAttachmentModal';
import { VoiceMessageButton } from '@/components/messages/VoiceMessageButton';
import { MessageChargeWarningModal } from '@/components/messages/MessageChargeWarningModal';
import { InsufficientBalanceModal } from '@/components/messages/InsufficientBalanceModal';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';
import { useToastContext } from '@/context/ToastContext';

type Message = {
  id: string;
  content: string;
  messageType: 'text' | 'media' | 'tip' | 'locked' | 'system' | null;
  createdAt: Date;
  updatedAt?: Date;
  isLocked: boolean;
  unlockPrice: number | null;
  unlockedBy: string | null;
  tipAmount: number | null;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  sender: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

type Conversation = {
  id: string;
  otherUser: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
    messageCharge?: number | null;
    messagingEnabled?: boolean;
  };
};

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const { showError } = useToastContext();
  const conversationId = params.conversationId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const lastMessageCountRef = useRef(0);

  // Cost display - single source of truth, never reset once set
  const [costPerMessage, setCostPerMessage] = useState<number | null>(null);
  const [recipientIsCreator, setRecipientIsCreator] = useState<boolean>(false);
  const costFetchedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showChargeWarning, setShowChargeWarning] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [hasAcknowledgedCharge, setHasAcknowledgedCharge] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState<{
    required: number;
    balance: number;
    type: 'message' | 'media' | 'voice';
  } | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMessageCursor, setOldestMessageCursor] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Map<string, { content: string; timestamp: Date }>>(new Map());
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user balance for paid messaging
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

  useEffect(() => {
    checkAuth();
    fetchConversation();
    fetchMessages();
    markAsRead();
    fetchUserBalance();

    // Subscribe to real-time messages
    const supabase = createClient();
    const messageChannel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
          markAsRead();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe((status) => {
        console.log('[Chat] Real-time subscription status:', status);
        const isConnected = status === 'SUBSCRIBED';
        setRealtimeConnected(isConnected);

        // Smart polling: only poll when real-time is not connected
        if (isConnected) {
          // Real-time working - stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            console.log('[Chat] Real-time connected, stopping fallback polling');
          }
        } else if (!pollIntervalRef.current) {
          // Real-time not connected - start fallback polling
          console.log('[Chat] Real-time not connected, starting fallback polling');
          pollIntervalRef.current = setInterval(() => {
            fetchMessages();
          }, 5000);
        }
      });

    // Subscribe to typing indicators via Ably
    let typingChannel: Ably.RealtimeChannel | null = null;

    const setupTypingChannel = async () => {
      try {
        const ably = getAblyClient();

        // Wait for connection
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

        typingChannel = ably.channels.get(`dm:${conversationId}`);
        typingChannel.subscribe('typing', (message) => {
          const { userId, isTyping } = message.data;
          // Only show typing indicator if it's from the other user
          if (userId !== currentUserId) {
            setIsOtherUserTyping(isTyping);
            // Auto-clear typing indicator after 5 seconds (extended for slow typers)
            if (isTyping) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 5000);
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
        // Only detach if the channel is actually attached
        // This prevents "Attach request superseded by subsequent detach request" errors
        if (typingChannel.state === 'attached') {
          typingChannel.detach().catch(() => {});
        }
      }
      // Clean up fallback polling if active
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, currentUserId]);

  // Smart auto-scroll: only scroll on initial load or when new messages arrive and user is near bottom
  useEffect(() => {
    const messageCount = messages.length;
    const hasNewMessages = messageCount > lastMessageCountRef.current;

    // Always scroll on initial load
    if (isInitialLoadRef.current && messageCount > 0) {
      isInitialLoadRef.current = false;
      lastMessageCountRef.current = messageCount;
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
      return;
    }

    // Only scroll if there are NEW messages AND user is near bottom
    if (hasNewMessages && isNearBottomRef.current) {
      lastMessageCountRef.current = messageCount;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      // Just update the count without scrolling
      lastMessageCountRef.current = messageCount;
    }
  }, [messages]);

  // Auto-acknowledge charge if user has already sent messages in this conversation
  useEffect(() => {
    if (currentUserId && messages.length > 0 && recipientIsCreator) {
      const hasUserSentMessages = messages.some(m => m.sender.id === currentUserId);
      if (hasUserSentMessages) {
        setHasAcknowledgedCharge(true);
      }
    }
  }, [currentUserId, messages, recipientIsCreator]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    setCurrentUserId(user.id);

    // Fetch user role and admin status
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

  const fetchConversation = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();

      if (response.ok) {
        const conversations = data.data || data.conversations || [];
        const conv = conversations.find((c: any) => c.id === conversationId);
        if (conv) {
          setConversation(conv);

          // Set cost info from conversation data (already includes messageCharge)
          if (!costFetchedRef.current && conv.otherUser?.id) {
            const isCreator = conv.otherUser?.role === 'creator';
            if (isCreator) {
              setRecipientIsCreator(true);
              // Use messageCharge from conversation if available, otherwise fetch it
              if (typeof conv.otherUser.messageCharge === 'number') {
                costFetchedRef.current = true;
                setCostPerMessage(conv.otherUser.messageCharge);
                console.log('[Chat] Got creator rate from conversation:', conv.otherUser.messageCharge);
              } else {
                // Fallback: fetch the rate directly from the dedicated API
                fetchCreatorRate(conv.otherUser.id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  // Simple, dedicated function to fetch creator's rate - only runs once
  const fetchCreatorRate = async (creatorId: string) => {
    if (costFetchedRef.current) return; // Already fetched

    try {
      const response = await fetch(`/api/creator/${creatorId}/rate`);
      if (response.ok) {
        const data = await response.json();
        const rate = typeof data.messageRate === 'number' ? data.messageRate : 0;
        console.log('[Chat] Got creator rate:', rate);

        // Mark as fetched and set the cost
        costFetchedRef.current = true;
        setCostPerMessage(rate);
        setRecipientIsCreator(true);
      }
    } catch (error) {
      console.error('Error fetching creator rate:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      // Use cursor-based pagination for better reliability
      const response = await fetch(`/api/messages/conversations/${conversationId}?limit=100&useCursor=true`);
      const data = await response.json();

      if (response.ok) {
        const fetchedMessages = data.messages.reverse();

        // Clear pending messages that have been confirmed
        if (pendingMessages.size > 0) {
          setPendingMessages(prev => {
            const newPending = new Map(prev);
            // Remove pending messages that are now in the real messages
            // (match by content and timestamp proximity)
            Array.from(prev.entries()).forEach(([tempId, pending]) => {
              const isConfirmed = fetchedMessages.some((m: Message) =>
                m.content === pending.content &&
                Math.abs(new Date(m.createdAt).getTime() - pending.timestamp.getTime()) < 10000
              );
              if (isConfirmed) {
                newPending.delete(tempId);
              }
            });
            return newPending;
          });
        }

        // Track new messages when user is scrolled up
        if (!isNearBottomRef.current && messages.length > 0) {
          const existingIds = new Set(messages.map(m => m.id));
          const newMsgs = fetchedMessages.filter((m: Message) => !existingIds.has(m.id) && m.sender.id !== currentUserId);
          if (newMsgs.length > 0) {
            setNewMessageCount(prev => prev + newMsgs.length);
          }
        }

        setMessages(fetchedMessages);
        setHasMoreMessages(data.hasMore ?? data.messages.length >= 100);

        // Store cursor of oldest message for loading more
        if (fetchedMessages.length > 0) {
          setOldestMessageCursor(fetchedMessages[0].createdAt.toString());
        }

        // Backup: if we don't have rate info yet, check messages for creator
        if (!costFetchedRef.current && fetchedMessages.length > 0 && currentUserId) {
          // Find the other user from messages (someone who is not the current user)
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
      // Use cursor-based pagination - get messages older than our oldest
      const response = await fetch(
        `/api/messages/conversations/${conversationId}?limit=100&cursor=${encodeURIComponent(oldestMessageCursor)}&direction=older`
      );
      const data = await response.json();

      if (response.ok && data.messages.length > 0) {
        // Prepend older messages to the beginning
        const olderMessages = data.messages.reverse();
        setMessages(prev => [...olderMessages, ...prev]);
        // Update lastMessageCountRef to prevent scroll
        lastMessageCountRef.current = messages.length + olderMessages.length;
        // Update cursor to oldest message
        setOldestMessageCursor(olderMessages[0].createdAt.toString());
        // Check if there are more
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversation) return;

    // Messaging cost rules:
    // - Admin → Anyone: ALWAYS FREE (admins can chat for free)
    // - Creator → Fan: ALWAYS FREE (creators don't pay to message fans)
    // - Fan → Creator: Fan pays the creator's message rate (if set)
    // - Creator → Creator: Sender pays the receiver's message rate (if set)
    const shouldCheckCharge = recipientIsCreator && !currentUserIsAdmin; // Admins never pay
    const chargeAmount = costPerMessage || 0;

    // Check if recipient has message charging enabled
    if (shouldCheckCharge && chargeAmount > 0) {
      // If user hasn't acknowledged the charge yet, show warning for first message
      if (!hasAcknowledgedCharge) {
        setPendingMessage(newMessage.trim());
        setShowChargeWarning(true);
        return;
      }

      // User has acknowledged - check if they have enough balance
      if (userBalance !== null && userBalance < chargeAmount) {
        // Insufficient balance - show warning
        setPendingMessage(newMessage.trim());
        setShowChargeWarning(true);
        return;
      }

      // Has enough balance and already acknowledged - auto-send
    }

    // Send normally (no charge, or already acknowledged with enough balance)
    await actualSendMessage(newMessage.trim());
  };

  const actualSendMessage = async (content: string) => {
    if (!conversation || !currentUserId) return;

    setSending(true);
    // Stop typing indicator when sending
    sendTypingIndicator(false);

    // Generate a temporary ID for optimistic UI
    const tempId = `pending-${Date.now()}`;
    const timestamp = new Date();

    // Optimistic update: add pending message immediately
    setPendingMessages(prev => new Map(prev).set(tempId, { content, timestamp }));

    // Clear input immediately for better UX
    setNewMessage('');
    setPendingMessage('');

    // Force scroll to bottom after adding optimistic message
    scrollToBottom(true);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: conversation.otherUser.id,
          content,
        }),
      });

      if (response.ok) {
        // Mark as acknowledged if this was a paid message to a creator
        if (recipientIsCreator && (costPerMessage || 0) > 0) {
          setHasAcknowledgedCharge(true);
        }
        // Refresh balance after sending paid message
        fetchUserBalance();
        // Fetch messages to get the real message (will clear pending)
        fetchMessages();
      } else {
        const data = await response.json();
        // Remove failed pending message
        setPendingMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          return newMap;
        });

        if (data.error?.includes('Insufficient balance')) {
          // Show the charge warning modal with insufficient balance
          setPendingMessage(content);
          setShowChargeWarning(true);
        } else {
          showError(data.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove failed pending message
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      showError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleUnlockMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/unlock`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh messages to show unlocked content
        fetchMessages();
      } else {
        throw new Error(data.error || 'Failed to unlock message');
      }
    } catch (error) {
      console.error('Error unlocking message:', error);
      showError(error instanceof Error ? error.message : 'Failed to unlock message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        // Remove message from local state
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } else {
        throw new Error(data.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update message in local state
        setMessages(prev => prev.map(m =>
          m.id === messageId
            ? { ...m, content: newContent, updatedAt: new Date() }
            : m
        ));
      } else {
        throw new Error(data.error || 'Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  };

  const handleSendTip = async (amount: number, tipMessage: string, giftId?: string, giftEmoji?: string, giftName?: string) => {
    if (!conversation) return;

    try {
      const response = await fetch('/api/messages/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          receiverId: conversation.otherUser.id,
          amount,
          tipMessage,
          giftId,
          giftEmoji,
          giftName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchMessages();
      } else {
        throw new Error(data.error || 'Failed to send gift');
      }
    } catch (error) {
      console.error('Error sending gift:', error);
      throw error;
    }
  };

  const handleSendMedia = async (data: {
    file?: File;
    contentId?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    caption: string;
    isLocked: boolean;
    unlockPrice: number;
  }) => {
    if (!conversation) return;

    try {
      let response;

      if (data.file) {
        // New file upload
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('recipientId', conversation.otherUser.id);
        formData.append('caption', data.caption);
        formData.append('isLocked', data.isLocked.toString());
        formData.append('unlockPrice', data.unlockPrice.toString());

        response = await fetch('/api/messages/send-media', {
          method: 'POST',
          body: formData,
        });
      } else if (data.mediaUrl) {
        // Send from library (existing content)
        response = await fetch('/api/messages/send-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: conversation.otherUser.id,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            contentId: data.contentId,
            caption: data.caption,
            isLocked: data.isLocked,
            unlockPrice: data.unlockPrice,
          }),
        });
      } else {
        throw new Error('No media provided');
      }

      // Handle non-JSON responses (e.g., timeout errors, body size limits)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response from server');
        throw new Error('File too large. Please choose a smaller file (under 5MB).');
      }

      const result = await response.json();

      if (!response.ok) {
        // Check for insufficient balance
        if (response.status === 402 && result.required && result.balance !== undefined) {
          setInsufficientBalanceInfo({
            required: result.required,
            balance: result.balance,
            type: result.type || 'media',
          });
          return; // Don't throw, modal will handle it
        }
        throw new Error(result.error || 'Failed to send media');
      }

      fetchMessages();
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    }
  };

  const handleSendVoice = async (audioBlob: Blob, duration: number, unlockPrice?: number) => {
    if (!conversation) return;

    try {
      // Create FormData for audio upload
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('recipientId', conversation.otherUser.id);
      formData.append('duration', duration.toString());
      if (unlockPrice && unlockPrice > 0) {
        formData.append('isLocked', 'true');
        formData.append('unlockPrice', unlockPrice.toString());
      }

      const response = await fetch('/api/messages/send-voice', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Check for insufficient balance
        if (response.status === 402 && result.required && result.balance !== undefined) {
          setInsufficientBalanceInfo({
            required: result.required,
            balance: result.balance,
            type: result.type || 'voice',
          });
          return; // Don't throw, modal will handle it
        }
        throw new Error(result.error || 'Failed to send voice message');
      }

      fetchMessages();
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Error sending voice message:', error);
      throw error;
    }
  };

  const scrollToBottom = (force = false) => {
    if (force) {
      isNearBottomRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Check if user is near the bottom of the messages container
  // Using a larger threshold for mobile touch scrolling
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 200; // pixels from bottom - larger for mobile
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const wasNearBottom = isNearBottomRef.current;
    isNearBottomRef.current = distanceFromBottom < threshold;

    // Clear new message count when user scrolls to bottom
    if (!wasNearBottom && isNearBottomRef.current && newMessageCount > 0) {
      setNewMessageCount(0);
    }
  }, [newMessageCount]);

  const handleBlockUser = async () => {
    if (!conversation) return;

    if (!confirm(`Block ${conversation.otherUser.username}? This will prevent them from viewing your streams, sending you messages, gifts, and call requests.`)) return;

    setIsBlocking(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockedId: conversation.otherUser.id,
          reason: 'Blocked from DM',
        }),
      });

      if (response.ok) {
        setShowOptionsMenu(false);
        router.push('/chats');
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to block user');
      }
    } catch (error) {
      showError('Failed to block user');
    } finally {
      setIsBlocking(false);
    }
  };

  // Send typing indicator (throttled to once per second)
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    const now = Date.now();
    // Throttle: don't send more than once per second for "typing" events
    if (isTyping && now - lastTypingSentRef.current < 1000) {
      return;
    }
    lastTypingSentRef.current = now;

    try {
      await fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, isTyping }),
      });
    } catch (error) {
      // Silently fail - typing indicators are not critical
    }
  }, [conversationId]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.trim()) {
      sendTypingIndicator(true);
    } else {
      sendTypingIndicator(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Conversation not found</h2>
          <button
            onClick={() => router.push('/chats')}
            className="px-6 py-3 bg-digis-cyan text-gray-900 rounded-lg font-semibold hover:scale-105 transition-transform"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
        {/* Header */}
        <div className="backdrop-blur-xl bg-black/60 border-b border-white/10 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/chats')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Tappable profile link */}
                <button
                  onClick={() => router.push(`/${conversation.otherUser.username}`)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold">
                    {conversation.otherUser.avatarUrl ? (
                      <img
                        src={conversation.otherUser.avatarUrl}
                        alt={conversation.otherUser.username || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white">
                        {conversation.otherUser.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>

                  <div className="text-left">
                    <h2 className="font-semibold text-white">
                      {conversation.otherUser.username}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {conversation.otherUser.role === 'creator' ? 'Creator' : 'Fan'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Options Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className="p-2.5 rounded-xl bg-white/10 border border-white/20 hover:border-white/40 transition-all hover:scale-105 text-white"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {showOptionsMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowOptionsMenu(false)}
                      />
                      <div className="absolute right-0 top-12 bg-black/95 backdrop-blur-xl rounded-lg border border-white/20 p-2 min-w-[160px] z-50 shadow-xl">
                        <button
                          onClick={() => {
                            router.push(`/${conversation.otherUser.username}`);
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded flex items-center gap-2"
                        >
                          👤 View Profile
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button
                          onClick={handleBlockUser}
                          disabled={isBlocking}
                          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded flex items-center gap-2 disabled:opacity-50"
                        >
                          ⛔ Block User
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          onTouchMove={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain relative"
        >
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            <div className="space-y-4">
              {/* Load older messages button */}
              {messages.length > 0 && hasMoreMessages && (
                <div className="text-center py-2">
                  <button
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load older messages'}
                  </button>
                </div>
              )}

              {messages.length === 0 && pendingMessages.size === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👋</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Start the conversation!</h3>
                  <p className="text-gray-400">Send a message to get started</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwnMessage={message.sender.id === currentUserId}
                      currentUserId={currentUserId || ''}
                      onUnlock={handleUnlockMessage}
                      onDelete={handleDeleteMessage}
                      onEdit={handleEditMessage}
                    />
                  ))}

                  {/* Optimistic pending messages */}
                  {Array.from(pendingMessages).map(([tempId, pending]) => (
                    <div key={tempId} className="flex justify-end">
                      <div className="max-w-[70%]">
                        <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/70 to-purple-500/70 text-white">
                          <p className="break-words">{pending.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 flex items-center justify-end gap-1">
                          <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                          Sending...
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {isOtherUserTyping && conversation && (
                <TypingIndicator
                  userName={conversation.otherUser.username || undefined}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* New messages badge - appears when scrolled up and new messages arrive */}
          {newMessageCount > 0 && !isNearBottomRef.current && (
            <button
              onClick={() => {
                setNewMessageCount(0);
                scrollToBottom(true);
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-500 text-white rounded-full text-sm font-medium shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-all animate-bounce flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Message Input - pb-20 on mobile for bottom nav, pb-4 on desktop */}
        <div className="backdrop-blur-xl bg-black/60 border-t border-white/10 sticky bottom-0 pb-16 lg:pb-0">
          <div className="container mx-auto px-4 py-4 max-w-2xl">
            {/* Voice Recorder - shown when recording */}
            {showVoiceRecorder ? (
              <VoiceMessageButton
                onSend={async (blob, duration, price) => {
                  await handleSendVoice(blob, duration, price);
                  setShowVoiceRecorder(false);
                }}
                isCreator={currentUserRole === 'creator'}
                autoStart={true}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <form onSubmit={sendMessage} className="relative flex gap-2 items-center pt-6">
                {/* Attachment Menu Button */}
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className={`p-2.5 border rounded-full transition-all flex items-center justify-center ${
                      showAttachmentMenu
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300'
                        : 'bg-white/10 border-white/30 hover:bg-white/20 hover:border-cyan-400 text-white'
                    }`}
                    title="Attach"
                  >
                    {showAttachmentMenu ? (
                      <X className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>

                  {/* Attachment Menu Popup */}
                  {showAttachmentMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowAttachmentMenu(false)}
                      />
                      <div className="absolute bottom-14 left-0 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/20 p-2 min-w-[180px] z-50 shadow-xl shadow-black/50">
                        <button
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            setShowMediaModal(true);
                          }}
                          className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-cyan-500/20">
                            <Camera className="w-5 h-5 text-cyan-400" />
                          </div>
                          <span className="font-medium">Photo / Video</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowAttachmentMenu(false);
                            setShowVoiceRecorder(true);
                          }}
                          className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <Mic className="w-5 h-5 text-purple-400" />
                          </div>
                          <span className="font-medium">Voice Message</span>
                        </button>

                        {/* Gift/Tip - only when chatting with a creator */}
                        {recipientIsCreator && (
                          <button
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              setShowTipModal(true);
                            }}
                            className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-yellow-500/20">
                              <Gift className="w-5 h-5 text-yellow-400" />
                            </div>
                            <span className="font-medium">Send Gift</span>
                          </button>
                        )}

                        {currentUserRole === 'creator' && (
                          <button
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              setShowMediaModal(true);
                            }}
                            className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-green-500/20">
                              <FolderOpen className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="font-medium">From My Content</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Cost indicator - show above input when messaging a creator */}
                {recipientIsCreator && (costPerMessage || 0) > 0 && (
                  <div className="absolute -top-8 left-0 right-0 flex justify-center">
                    <div className={`px-3 py-1 ${currentUserIsAdmin ? 'bg-green-500/20 border-green-500/40' : 'bg-yellow-500/20 border-yellow-500/40'} border rounded-full flex items-center gap-1.5`}>
                      <Coins className={`w-3.5 h-3.5 ${currentUserIsAdmin ? 'text-green-400' : 'text-yellow-400'}`} />
                      <span className={`text-xs font-medium ${currentUserIsAdmin ? 'text-green-300' : 'text-yellow-300'}`}>
                        {costPerMessage} coins per message{currentUserIsAdmin && ' (free for admin)'}
                      </span>
                    </div>
                  </div>
                )}
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onBlur={() => sendTypingIndicator(false)}
                  placeholder="Message..."
                  className="flex-1 min-w-0 bg-white/10 border border-white/30 rounded-full px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:bg-white/15 transition-all text-base"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full text-sm font-bold hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0 shadow-lg shadow-cyan-500/20"
                >
                  {sending ? '...' : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && conversation && (
        <TipModal
          onClose={() => setShowTipModal(false)}
          onSend={handleSendTip}
          receiverName={conversation.otherUser.username || 'User'}
        />
      )}

      {/* Media Attachment Modal */}
      {showMediaModal && (
        <MediaAttachmentModal
          onClose={() => setShowMediaModal(false)}
          onSend={handleSendMedia}
          isCreator={currentUserRole === 'creator'}
          recipientIsCreator={recipientIsCreator}
        />
      )}

      {/* Message Charge Warning Modal */}
      {showChargeWarning && conversation && (
        <MessageChargeWarningModal
          recipientName={conversation.otherUser.username || 'Creator'}
          messageCharge={costPerMessage || 0}
          messagePreview={pendingMessage}
          onClose={() => {
            setShowChargeWarning(false);
            setPendingMessage('');
          }}
          onConfirm={async () => {
            setShowChargeWarning(false);
            setHasAcknowledgedCharge(true);
            await actualSendMessage(pendingMessage);
          }}
        />
      )}

      {/* Insufficient Balance Modal */}
      {insufficientBalanceInfo && (
        <InsufficientBalanceModal
          required={insufficientBalanceInfo.required}
          balance={insufficientBalanceInfo.balance}
          type={insufficientBalanceInfo.type}
          onClose={() => setInsufficientBalanceInfo(null)}
        />
      )}
    </>
  );
}
