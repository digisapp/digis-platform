'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { TipModal } from '@/components/messages/TipModal';
import { MediaAttachmentModal } from '@/components/messages/MediaAttachmentModal';
import { VoiceMessageButton } from '@/components/messages/VoiceMessageButton';
import { MessageChargeWarningModal } from '@/components/messages/MessageChargeWarningModal';

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
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showChargeWarning, setShowChargeWarning] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  useEffect(() => {
    checkAuth();
    fetchConversation();
    fetchMessages();
    markAsRead();

    // Subscribe to real-time messages
    const supabase = createClient();
    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
  };

  const fetchConversation = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();

      if (response.ok) {
        const conv = data.conversations.find((c: any) => c.id === conversationId);
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
      // Show warning modal instead of sending immediately
      setPendingMessage(newMessage.trim());
      setShowChargeWarning(true);
      return;
    }

    // If no charge, send normally
    await actualSendMessage(newMessage.trim());
  };

  const actualSendMessage = async (content: string) => {
    if (!conversation) return;

    setSending(true);

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
        fetchMessages();
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

  const handleSendVoice = async (audioBlob: Blob, duration: number) => {
    if (!conversation) return;

    try {
      // Create FormData for audio upload
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('recipientId', conversation.otherUser.id);
      formData.append('duration', duration.toString());

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
        <div className="glass backdrop-blur-xl border-b border-purple-200 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/chats')}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
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
                  <h2 className="font-semibold text-gray-800">
                    {conversation.otherUser.displayName || conversation.otherUser.username}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {conversation.otherUser.role === 'creator' ? 'Creator' : 'Fan'}
                  </p>
                </div>
              </div>

              {/* Tip Button */}
              <button
                onClick={() => setShowTipModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg font-semibold hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span>💰</span>
                <span>Send Tip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👋</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Start the conversation!</h3>
                  <p className="text-gray-600">Send a message to get started</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwnMessage={message.sender.id === currentUserId}
                    currentUserId={currentUserId || ''}
                    onUnlock={handleUnlockMessage}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="glass backdrop-blur-xl border-t border-purple-200 sticky bottom-0">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <form onSubmit={sendMessage} className="flex gap-2">
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => setShowMediaModal(true)}
                className="p-3 bg-white/60 border border-purple-200 rounded-full hover:bg-white/80 hover:border-digis-cyan transition-all flex items-center justify-center"
                title="Attach media"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              {/* Voice Message Button */}
              <VoiceMessageButton onSend={handleSendVoice} />

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-white/60 border border-purple-200 rounded-full px-6 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-digis-cyan transition-colors"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="px-6 py-3 bg-gradient-to-r from-digis-cyan to-digis-pink text-gray-900 rounded-full font-semibold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
          onConfirm={() => actualSendMessage(pendingMessage)}
        />
      )}
    </>
  );
}
