'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { TipModal } from '@/components/messages/TipModal';
import { Gift } from 'lucide-react';
import { MediaAttachmentModal } from '@/components/messages/MediaAttachmentModal';
import { VoiceMessageButton } from '@/components/messages/VoiceMessageButton';
import { MessageChargeWarningModal } from '@/components/messages/MessageChargeWarningModal';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { getAblyClient } from '@/lib/ably/client';
import type Ably from 'ably';

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
  const conversationId = params.conversationId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    setCurrentUserId(user.id);

    // Fetch user role
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const userData = await response.json();
        setCurrentUserRole(userData.role || 'fan');
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
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.messages.reverse());
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
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

    // Check if recipient has message charging enabled
    const messageCharge = conversation.otherUser.messageCharge;
    if (messageCharge && messageCharge > 0) {
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
        // Mark as acknowledged if this was a paid message
        if (conversation.otherUser.messageCharge && conversation.otherUser.messageCharge > 0) {
          setHasAcknowledgedCharge(true);
        }
        // Refresh balance after sending paid message
        fetchUserBalance();
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
      alert(error instanceof Error ? error.message : 'Failed to unlock message');
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

  const handleSendTip = async (amount: number, tipMessage: string) => {
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchMessages();
      } else {
        throw new Error(data.error || 'Failed to send tip');
      }
    } catch (error) {
      console.error('Error sending tip:', error);
      throw error;
    }
  };

  const handleSendMedia = async (data: {
    file: File;
    caption: string;
    isLocked: boolean;
    unlockPrice: number;
  }) => {
    if (!conversation) return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('recipientId', conversation.otherUser.id);
      formData.append('caption', data.caption);
      formData.append('isLocked', data.isLocked.toString());
      formData.append('unlockPrice', data.unlockPrice.toString());

      const response = await fetch('/api/messages/send-media', {
        method: 'POST',
        body: formData,
      });

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-digis-cyan to-digis-pink flex items-center justify-center text-lg font-bold">
                  {conversation.otherUser.avatarUrl ? (
                    <img
                      src={conversation.otherUser.avatarUrl}
                      alt={conversation.otherUser.displayName || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white">
                      {(conversation.otherUser.displayName || conversation.otherUser.username || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    {conversation.otherUser.displayName || conversation.otherUser.username}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {conversation.otherUser.role === 'creator' ? 'Creator' : 'Fan'}
                  </p>
                </div>
              </div>

              {/* Tip Button */}
              <button
                onClick={() => setShowTipModal(true)}
                className="p-2.5 rounded-xl bg-white/10 border border-white/20 hover:border-yellow-500/50 transition-all hover:scale-105 text-white"
              >
                <Gift className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            <div className="space-y-4">
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
                  userName={conversation.otherUser.displayName || conversation.otherUser.username || undefined}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="backdrop-blur-xl bg-black/60 border-t border-white/10 sticky bottom-0">
          <div className="container mx-auto px-4 py-4 max-w-2xl">
            <form onSubmit={sendMessage} className="flex gap-2">
              {/* Voice Message Button - placed first (furthest from input to avoid accidental taps) */}
              <VoiceMessageButton onSend={handleSendVoice} isCreator={currentUserRole === 'creator'} />

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="p-3 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 hover:border-cyan-500/50 transition-all flex items-center justify-center"
                title="Attach media"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                onBlur={() => sendTypingIndicator(false)}
                placeholder="Type a message..."
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      {showTipModal && conversation && (
        <TipModal
          onClose={() => setShowTipModal(false)}
          onSend={handleSendTip}
          receiverName={conversation.otherUser.displayName || conversation.otherUser.username || 'User'}
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
          recipientName={conversation.otherUser.displayName || conversation.otherUser.username || 'Creator'}
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
