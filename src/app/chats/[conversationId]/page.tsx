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
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';
import { useToastContext } from '@/context/ToastContext';

type Message = {
  id: string;
  content: string;
  messageType: 'text' | 'media' | 'tip' | 'locked' | 'system' | null;
  createdAt: Date;
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
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

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
            // Auto-clear typing indicator after 3 seconds
            if (isTyping) {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 3000);
            }
          }
        });
      } catch (err) {
        console.error('[Chat] Ably typing channel setup error:', err);
      }
    };

    setupTypingChannel();

    // Fallback polling every 5 seconds in case real-time fails
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 5000);

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
      clearInterval(pollInterval);
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
    if (currentUserId && messages.length > 0 && conversation?.otherUser.role === 'creator') {
      const hasUserSentMessages = messages.some(m => m.sender.id === currentUserId);
      if (hasUserSentMessages) {
        setHasAcknowledgedCharge(true);
      }
    }
  }, [currentUserId, messages, conversation]);

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
        // API returns { data: conversations[] } wrapper
        const conversations = data.data || data.conversations || [];
        const conv = conversations.find((c: any) => c.id === conversationId);
        if (conv) {
          setConversation(conv);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}?limit=100`);
      const data = await response.json();

      if (response.ok) {
        const fetchedMessages = data.messages.reverse();
        setMessages(fetchedMessages);
        // If we got less than 100, there are no more older messages
        setHasMoreMessages(data.messages.length >= 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMoreMessages) return;

    setLoadingMore(true);
    try {
      const offset = messages.length;
      const response = await fetch(`/api/messages/conversations/${conversationId}?limit=100&offset=${offset}`);
      const data = await response.json();

      if (response.ok && data.messages.length > 0) {
        // Prepend older messages to the beginning
        const olderMessages = data.messages.reverse();
        setMessages(prev => [...olderMessages, ...prev]);
        // Update lastMessageCountRef to prevent scroll
        lastMessageCountRef.current = messages.length + olderMessages.length;
        // Check if there are more
        setHasMoreMessages(data.messages.length >= 100);
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
    const isSenderCreator = currentUserRole === 'creator';
    const isRecipientCreator = conversation.otherUser.role === 'creator';
    const shouldCheckCharge = isRecipientCreator && !currentUserIsAdmin; // Admins never pay

    // Check if recipient has message charging enabled (only if they're a creator and sender is not admin)
    const messageCharge = conversation.otherUser.messageCharge;
    if (shouldCheckCharge && messageCharge && messageCharge > 0) {
      // If user hasn't acknowledged the charge yet, show warning for first message
      if (!hasAcknowledgedCharge) {
        setPendingMessage(newMessage.trim());
        setShowChargeWarning(true);
        return;
      }

      // User has acknowledged - check if they have enough balance
      if (userBalance !== null && userBalance < messageCharge) {
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
    if (!conversation) return;

    setSending(true);
    // Stop typing indicator when sending
    sendTypingIndicator(false);

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
        setNewMessage('');
        setPendingMessage('');
        // Mark as acknowledged if this was a paid message to a creator
        const isRecipientCreator = conversation.otherUser.role === 'creator';
        if (isRecipientCreator && conversation.otherUser.messageCharge && conversation.otherUser.messageCharge > 0) {
          setHasAcknowledgedCharge(true);
        }
        // Refresh balance after sending paid message
        fetchUserBalance();
        // Force scroll to bottom after sending own message
        scrollToBottom(true);
        fetchMessages();
      } else {
        const data = await response.json();
        if (data.error?.includes('Insufficient balance')) {
          // Show the charge warning modal with insufficient balance
          setPendingMessage(content);
          setShowChargeWarning(true);
        } else {
          console.error('Error sending message:', data.error);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
        throw new Error(result.error || 'Failed to send voice message');
      }

      fetchMessages();
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
    isNearBottomRef.current = distanceFromBottom < threshold;
  }, []);

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
                {/* Tip Button - Only show when chatting with a creator */}
                {conversation.otherUser.role === 'creator' && (
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="p-2.5 rounded-xl bg-white/10 border border-white/20 hover:border-yellow-500/50 transition-all hover:scale-105 text-white"
                  >
                    <Gift className="w-5 h-5" />
                  </button>
                )}

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
          className="flex-1 overflow-y-auto overscroll-contain"
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

              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👋</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Start the conversation!</h3>
                  <p className="text-gray-400">Send a message to get started</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.sender.id === currentUserId}
                    currentUserId={currentUserId || ''}
                    onUnlock={handleUnlockMessage}
                    onDelete={handleDeleteMessage}
                  />
                ))
              )}
              {isOtherUserTyping && conversation && (
                <TypingIndicator
                  userName={conversation.otherUser.username || undefined}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
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
              <form onSubmit={sendMessage} className="flex gap-2 items-center">
                {/* Attachment Menu Button */}
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className={`p-2.5 border rounded-full transition-all flex items-center justify-center ${
                      showAttachmentMenu
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-cyan-500/50 text-white'
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

                        {currentUserRole === 'creator' && (
                          <button
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              setShowMediaModal(true);
                            }}
                            className="w-full text-left px-4 py-3 text-white hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-yellow-500/20">
                              <FolderOpen className="w-5 h-5 text-yellow-400" />
                            </div>
                            <span className="font-medium">From Library</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onBlur={() => sendTypingIndicator(false)}
                  placeholder="Message..."
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-full px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-all text-sm"
                  disabled={sending}
                />
                {(() => {
                  const showCost = conversation?.otherUser.role === 'creator'
                    && conversation?.otherUser.messageCharge
                    && conversation.otherUser.messageCharge > 0
                    && !currentUserIsAdmin;
                  const cost = conversation?.otherUser.messageCharge || 0;

                  return (
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full text-sm font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0"
                    >
                      {sending ? '...' : (
                        showCost ? (
                          <>
                            <span>Send</span>
                            <span className="text-yellow-300 font-bold">{cost}</span>
                            <Coins className="w-3 h-3 text-yellow-300" />
                          </>
                        ) : (
                          'Send'
                        )
                      )}
                    </button>
                  );
                })()}
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
        />
      )}

      {/* Message Charge Warning Modal */}
      {showChargeWarning && conversation && (
        <MessageChargeWarningModal
          recipientName={conversation.otherUser.username || 'Creator'}
          messageCharge={conversation.otherUser.messageCharge || 0}
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
    </>
  );
}
